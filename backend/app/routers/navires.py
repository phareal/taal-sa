from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.navire import Navire
from app.schemas.common import Paginated
from app.schemas.navire import NavireCreate, NavireOut, NavireUpdate

router = APIRouter(prefix="/api/navires", tags=["navires"])


@router.get("/", response_model=Paginated[NavireOut])
async def list_navires(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    actif: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Navire)
    if search:
        q = q.where(Navire.nom.ilike(f"%{search}%"))
    if actif is not None:
        q = q.where(Navire.actif == actif)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(q.order_by(Navire.nom).offset((page - 1) * page_size).limit(page_size))
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/", response_model=NavireOut, status_code=201)
async def create_navire(data: NavireCreate, db: AsyncSession = Depends(get_db)):
    navire = Navire(**data.model_dump())
    db.add(navire)
    await db.commit()
    await db.refresh(navire)
    return navire


@router.get("/{navire_id}", response_model=NavireOut)
async def get_navire(navire_id: int, db: AsyncSession = Depends(get_db)):
    navire = await db.get(Navire, navire_id)
    if not navire:
        raise HTTPException(404, detail="Navire introuvable")
    return navire


@router.put("/{navire_id}", response_model=NavireOut)
async def update_navire(navire_id: int, data: NavireUpdate, db: AsyncSession = Depends(get_db)):
    navire = await db.get(Navire, navire_id)
    if not navire:
        raise HTTPException(404, detail="Navire introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(navire, k, v)
    await db.commit()
    await db.refresh(navire)
    return navire


@router.delete("/{navire_id}", status_code=204)
async def delete_navire(navire_id: int, db: AsyncSession = Depends(get_db)):
    navire = await db.get(Navire, navire_id)
    if not navire:
        raise HTTPException(404, detail="Navire introuvable")
    await db.delete(navire)
    await db.commit()
