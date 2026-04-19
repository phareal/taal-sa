from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.comptabilite import ComptabiliteEntry
from app.schemas.common import Paginated
from app.schemas.comptabilite import ComptabiliteCreate, ComptabiliteOut, ComptabiliteUpdate

router = APIRouter(prefix="/api/comptabilite", tags=["comptabilite"])


class ComptaSummary(BaseModel):
    annee: int | None
    total_recettes: int
    total_depenses: int
    resultat_net: int
    nb_recettes: int
    nb_depenses: int
    nb_en_attente: int
    montant_en_attente: int


@router.get("/summary", response_model=ComptaSummary)
async def get_summary(
    annee: int | None = Query(None),
    mois: int | None = Query(None, ge=1, le=12),
    semaine: int | None = Query(None, ge=1, le=53),
    db: AsyncSession = Depends(get_db),
) -> ComptaSummary:
    from sqlalchemy import case, extract

    filters = []
    if annee:
        filters.append(extract("year", ComptabiliteEntry.date_op) == annee)
    if mois:
        filters.append(extract("month", ComptabiliteEntry.date_op) == mois)
    if semaine:
        filters.append(extract("week", ComptabiliteEntry.date_op) == semaine)

    rows = (
        await db.execute(
            select(
                func.coalesce(
                    func.sum(case((ComptabiliteEntry.type_operation == "RECETTE", ComptabiliteEntry.montant_fcfa), else_=0)), 0
                ).label("total_recettes"),
                func.coalesce(
                    func.sum(case((ComptabiliteEntry.type_operation == "DEPENSE", ComptabiliteEntry.montant_fcfa), else_=0)), 0
                ).label("total_depenses"),
                func.count(case((ComptabiliteEntry.type_operation == "RECETTE", 1))).label("nb_recettes"),
                func.count(case((ComptabiliteEntry.type_operation == "DEPENSE", 1))).label("nb_depenses"),
                func.count(case((ComptabiliteEntry.statut_paiement == "EN ATTENTE", 1))).label("nb_en_attente"),
                func.coalesce(
                    func.sum(case((ComptabiliteEntry.statut_paiement == "EN ATTENTE", ComptabiliteEntry.montant_fcfa), else_=0)), 0
                ).label("montant_en_attente"),
            ).where(*filters)
        )
    ).one()

    recettes = int(rows.total_recettes or 0)
    depenses = int(rows.total_depenses or 0)

    return ComptaSummary(
        annee=annee,
        total_recettes=recettes,
        total_depenses=depenses,
        resultat_net=recettes - depenses,
        nb_recettes=int(rows.nb_recettes or 0),
        nb_depenses=int(rows.nb_depenses or 0),
        nb_en_attente=int(rows.nb_en_attente or 0),
        montant_en_attente=int(rows.montant_en_attente or 0),
    )


@router.get("/", response_model=Paginated[ComptabiliteOut])
async def list_entries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type_operation: str | None = Query(None),
    statut_paiement: str | None = Query(None),
    categorie: str | None = Query(None),
    annee: int | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import extract

    q = select(ComptabiliteEntry)
    if type_operation:
        q = q.where(ComptabiliteEntry.type_operation == type_operation)
    if statut_paiement:
        q = q.where(ComptabiliteEntry.statut_paiement == statut_paiement)
    if categorie:
        q = q.where(ComptabiliteEntry.categorie == categorie)
    if annee:
        q = q.where(extract("year", ComptabiliteEntry.date_op) == annee)
    if search:
        q = q.where(ComptabiliteEntry.libelle.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(
            q.order_by(ComptabiliteEntry.date_op.desc(), ComptabiliteEntry.id.desc())
             .offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/", response_model=ComptabiliteOut, status_code=201)
async def create_entry(data: ComptabiliteCreate, db: AsyncSession = Depends(get_db)):
    entry = ComptabiliteEntry(**data.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=ComptabiliteOut)
async def get_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    entry = await db.get(ComptabiliteEntry, entry_id)
    if not entry:
        raise HTTPException(404, detail="Entrée introuvable")
    return entry


@router.put("/{entry_id}", response_model=ComptabiliteOut)
async def update_entry(entry_id: int, data: ComptabiliteUpdate, db: AsyncSession = Depends(get_db)):
    entry = await db.get(ComptabiliteEntry, entry_id)
    if not entry:
        raise HTTPException(404, detail="Entrée introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(entry, k, v)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    entry = await db.get(ComptabiliteEntry, entry_id)
    if not entry:
        raise HTTPException(404, detail="Entrée introuvable")
    await db.delete(entry)
    await db.commit()
