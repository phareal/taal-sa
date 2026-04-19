from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.shipper import Shipper
from app.schemas.common import Paginated
from app.schemas.shipper import ShipperCreate, ShipperOut, ShipperUpdate

router = APIRouter(prefix="/api/shippers", tags=["shippers"])


@router.get("/", response_model=Paginated[ShipperOut])
async def list_shippers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    statut: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Shipper)
    if search:
        q = q.where(Shipper.nom.ilike(f"%{search}%"))
    if statut:
        q = q.where(Shipper.statut == statut)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(q.order_by(Shipper.nom).offset((page - 1) * page_size).limit(page_size))
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/", response_model=ShipperOut, status_code=201)
async def create_shipper(data: ShipperCreate, db: AsyncSession = Depends(get_db)):
    shipper = Shipper(**data.model_dump())
    db.add(shipper)
    await db.commit()
    await db.refresh(shipper)
    return shipper


@router.get("/{shipper_id}", response_model=ShipperOut)
async def get_shipper(shipper_id: int, db: AsyncSession = Depends(get_db)):
    shipper = await db.get(Shipper, shipper_id)
    if not shipper:
        raise HTTPException(404, detail="Shipper introuvable")
    return shipper


@router.put("/{shipper_id}", response_model=ShipperOut)
async def update_shipper(
    shipper_id: int, data: ShipperUpdate, db: AsyncSession = Depends(get_db)
):
    shipper = await db.get(Shipper, shipper_id)
    if not shipper:
        raise HTTPException(404, detail="Shipper introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(shipper, k, v)
    await db.commit()
    await db.refresh(shipper)
    return shipper


@router.delete("/{shipper_id}", status_code=204)
async def delete_shipper(shipper_id: int, db: AsyncSession = Depends(get_db)):
    shipper = await db.get(Shipper, shipper_id)
    if not shipper:
        raise HTTPException(404, detail="Shipper introuvable")
    await db.delete(shipper)
    await db.commit()
