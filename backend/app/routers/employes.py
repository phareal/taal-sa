from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.employe import Employe, PerformanceRH
from app.schemas.common import Paginated
from app.schemas.employe import (
    EmployeCreate, EmployeOut, EmployeUpdate,
    PerformanceCreate, PerformanceOut, PerformanceUpdate,
)

router = APIRouter(prefix="/api/employes", tags=["employes"])


# ── Employés ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=Paginated[EmployeOut])
async def list_employes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    departement: str | None = Query(None),
    statut: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Employe)
    if search:
        q = q.where(
            Employe.nom.ilike(f"%{search}%") |
            Employe.prenom.ilike(f"%{search}%") |
            Employe.matricule.ilike(f"%{search}%")
        )
    if departement:
        q = q.where(Employe.departement == departement)
    if statut:
        q = q.where(Employe.statut == statut)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(
            q.order_by(Employe.departement, Employe.nom)
             .offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/", response_model=EmployeOut, status_code=201)
async def create_employe(data: EmployeCreate, db: AsyncSession = Depends(get_db)):
    emp = Employe(**data.model_dump())
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.get("/{employe_id}", response_model=EmployeOut)
async def get_employe(employe_id: int, db: AsyncSession = Depends(get_db)):
    emp = await db.get(Employe, employe_id)
    if not emp:
        raise HTTPException(404, detail="Employé introuvable")
    return emp


@router.put("/{employe_id}", response_model=EmployeOut)
async def update_employe(employe_id: int, data: EmployeUpdate, db: AsyncSession = Depends(get_db)):
    emp = await db.get(Employe, employe_id)
    if not emp:
        raise HTTPException(404, detail="Employé introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(emp, k, v)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.delete("/{employe_id}", status_code=204)
async def delete_employe(employe_id: int, db: AsyncSession = Depends(get_db)):
    emp = await db.get(Employe, employe_id)
    if not emp:
        raise HTTPException(404, detail="Employé introuvable")
    await db.delete(emp)
    await db.commit()


# ── Performances ─────────────────────────────────────────────────────────────

perf_router = APIRouter(prefix="/api/performances", tags=["performances"])


@perf_router.get("/", response_model=Paginated[PerformanceOut])
async def list_performances(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    employe_id: int | None = Query(None),
    annee: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(PerformanceRH)
    if employe_id:
        q = q.where(PerformanceRH.employe_id == employe_id)
    if annee:
        q = q.where(PerformanceRH.annee == annee)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(
            q.order_by(PerformanceRH.annee.desc(), PerformanceRH.employe_id)
             .offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@perf_router.post("/", response_model=PerformanceOut, status_code=201)
async def create_performance(data: PerformanceCreate, db: AsyncSession = Depends(get_db)):
    perf = PerformanceRH(**data.model_dump())
    db.add(perf)
    await db.commit()
    await db.refresh(perf)
    return perf


@perf_router.put("/{perf_id}", response_model=PerformanceOut)
async def update_performance(perf_id: int, data: PerformanceUpdate, db: AsyncSession = Depends(get_db)):
    perf = await db.get(PerformanceRH, perf_id)
    if not perf:
        raise HTTPException(404, detail="Enregistrement introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(perf, k, v)
    await db.commit()
    await db.refresh(perf)
    return perf


@perf_router.delete("/{perf_id}", status_code=204)
async def delete_performance(perf_id: int, db: AsyncSession = Depends(get_db)):
    perf = await db.get(PerformanceRH, perf_id)
    if not perf:
        raise HTTPException(404, detail="Enregistrement introuvable")
    await db.delete(perf)
    await db.commit()
