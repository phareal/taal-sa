from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.connaissement import Connaissement
from app.schemas.common import Paginated
from app.schemas.connaissement import ConnaissementCreate, ConnaissementOut, ConnaissementUpdate

router = APIRouter(prefix="/api/connaissements", tags=["connaissements"])


@router.get("/", response_model=Paginated[ConnaissementOut])
async def list_connaissements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    annee: int | None = Query(None),
    mois_num: int | None = Query(None),
    type_operation: str | None = Query(None),
    shipper_id: int | None = Query(None),
    client_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Connaissement)
    if search:
        q = q.where(Connaissement.numero_bl.ilike(f"%{search}%"))
    if annee:
        q = q.where(Connaissement.annee == annee)
    if mois_num:
        q = q.where(Connaissement.mois_num == mois_num)
    if type_operation:
        q = q.where(Connaissement.type_operation == type_operation)
    if shipper_id:
        q = q.where(Connaissement.shipper_id == shipper_id)
    if client_id:
        q = q.where(Connaissement.client_id == client_id)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(
            q.order_by(Connaissement.annee.desc(), Connaissement.mois_num.desc(), Connaissement.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/", response_model=ConnaissementOut, status_code=201)
async def create_connaissement(data: ConnaissementCreate, db: AsyncSession = Depends(get_db)):
    bl = Connaissement(**data.model_dump())
    db.add(bl)
    await db.commit()
    await db.refresh(bl)
    return bl


@router.get("/{bl_id}", response_model=ConnaissementOut)
async def get_connaissement(bl_id: int, db: AsyncSession = Depends(get_db)):
    bl = await db.get(Connaissement, bl_id)
    if not bl:
        raise HTTPException(404, detail="Connaissement introuvable")
    return bl


@router.put("/{bl_id}", response_model=ConnaissementOut)
async def update_connaissement(
    bl_id: int, data: ConnaissementUpdate, db: AsyncSession = Depends(get_db)
):
    bl = await db.get(Connaissement, bl_id)
    if not bl:
        raise HTTPException(404, detail="Connaissement introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(bl, k, v)
    await db.commit()
    await db.refresh(bl)
    return bl


@router.delete("/{bl_id}", status_code=204)
async def delete_connaissement(bl_id: int, db: AsyncSession = Depends(get_db)):
    bl = await db.get(Connaissement, bl_id)
    if not bl:
        raise HTTPException(404, detail="Connaissement introuvable")
    await db.delete(bl)
    await db.commit()
