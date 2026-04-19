from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.prospect import Prospect
from app.schemas.common import Paginated
from app.schemas.prospect import ProspectCreate, ProspectOut, ProspectUpdate

router = APIRouter(prefix="/api/prospects", tags=["prospects"])


@router.get("/", response_model=Paginated[ProspectOut])
async def list_prospects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    priorite: str | None = Query(None),
    statut_relance: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Prospect)
    if priorite:
        q = q.where(Prospect.priorite == priorite)
    if statut_relance:
        q = q.where(Prospect.statut_relance == statut_relance)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(
            q.order_by(Prospect.priorite, Prospect.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/", response_model=ProspectOut, status_code=201)
async def create_prospect(data: ProspectCreate, db: AsyncSession = Depends(get_db)):
    prospect = Prospect(**data.model_dump())
    db.add(prospect)
    await db.commit()
    await db.refresh(prospect)
    return prospect


@router.get("/{prospect_id}", response_model=ProspectOut)
async def get_prospect(prospect_id: int, db: AsyncSession = Depends(get_db)):
    prospect = await db.get(Prospect, prospect_id)
    if not prospect:
        raise HTTPException(404, detail="Prospect introuvable")
    return prospect


@router.put("/{prospect_id}", response_model=ProspectOut)
async def update_prospect(
    prospect_id: int, data: ProspectUpdate, db: AsyncSession = Depends(get_db)
):
    prospect = await db.get(Prospect, prospect_id)
    if not prospect:
        raise HTTPException(404, detail="Prospect introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(prospect, k, v)
    await db.commit()
    await db.refresh(prospect)
    return prospect


@router.delete("/{prospect_id}", status_code=204)
async def delete_prospect(prospect_id: int, db: AsyncSession = Depends(get_db)):
    prospect = await db.get(Prospect, prospect_id)
    if not prospect:
        raise HTTPException(404, detail="Prospect introuvable")
    await db.delete(prospect)
    await db.commit()
