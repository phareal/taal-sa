from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.audit import AuditEntree
from app.schemas.audit import AuditCreate, AuditOut, AuditUpdate
from app.schemas.common import Paginated

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("/", response_model=Paginated[AuditOut])
async def list_audits(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type_audit: str | None = Query(None),
    statut: str | None = Query(None),
    priorite: str | None = Query(None),
    conformite: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditEntree)
    if type_audit:
        q = q.where(AuditEntree.type_audit == type_audit)
    if statut:
        q = q.where(AuditEntree.statut == statut)
    if priorite:
        q = q.where(AuditEntree.priorite == priorite)
    if conformite:
        q = q.where(AuditEntree.conformite == conformite)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(
            q.order_by(AuditEntree.date_audit.desc(), AuditEntree.id.desc())
             .offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/", response_model=AuditOut, status_code=201)
async def create_audit(data: AuditCreate, db: AsyncSession = Depends(get_db)):
    body = data.model_dump()
    if not body.get("reference"):
        # Auto-generate reference: AUD-YYYY-NNN
        from datetime import date
        year = body.get("date_audit", date.today())
        if hasattr(year, "year"):
            year = year.year
        count = (
            await db.execute(
                select(func.count()).where(
                    func.extract("year", AuditEntree.date_audit) == year
                )
            )
        ).scalar_one()
        body["reference"] = f"AUD-{year}-{count + 1:03d}"
    audit = AuditEntree(**body)
    db.add(audit)
    await db.commit()
    await db.refresh(audit)
    return audit


@router.get("/{audit_id}", response_model=AuditOut)
async def get_audit(audit_id: int, db: AsyncSession = Depends(get_db)):
    audit = await db.get(AuditEntree, audit_id)
    if not audit:
        raise HTTPException(404, detail="Audit introuvable")
    return audit


@router.put("/{audit_id}", response_model=AuditOut)
async def update_audit(audit_id: int, data: AuditUpdate, db: AsyncSession = Depends(get_db)):
    audit = await db.get(AuditEntree, audit_id)
    if not audit:
        raise HTTPException(404, detail="Audit introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(audit, k, v)
    await db.commit()
    await db.refresh(audit)
    return audit


@router.delete("/{audit_id}", status_code=204)
async def delete_audit(audit_id: int, db: AsyncSession = Depends(get_db)):
    audit = await db.get(AuditEntree, audit_id)
    if not audit:
        raise HTTPException(404, detail="Audit introuvable")
    await db.delete(audit)
    await db.commit()
