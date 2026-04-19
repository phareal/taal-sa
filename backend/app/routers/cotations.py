from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.cotation import Cotation
from app.schemas.common import Paginated
from app.schemas.cotation import CotationCreate, CotationOut, CotationUpdate

router = APIRouter(prefix="/api/cotations", tags=["cotations"])


def _apply_marge(cotation: Cotation) -> None:
    """
    marge = cotation_client − offre_transitaire.
    Source de vérité backend : toute valeur client est écrasée.
    """
    o = cotation.offre_transitaire
    c = cotation.cotation_client
    cotation.marge = (c - o) if (o is not None and c is not None) else None


async def _auto_numero(db: AsyncSession, annee: int) -> str:
    """Génère le prochain numéro COT-YYYY-NNN pour l'année donnée."""
    count = (
        await db.execute(
            select(func.count()).where(
                func.extract("year", Cotation.date_cotation) == annee
            )
        )
    ).scalar_one()
    return f"COT-{annee}-{count + 1:03d}"


@router.get("/", response_model=Paginated[CotationOut])
async def list_cotations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    resultat: str | None = Query(None),
    statut_paiement: str | None = Query(None),
    nature_operation: str | None = Query(None),
    agent_commercial: str | None = Query(None),
    annee: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Cotation)
    if search:
        q = q.where(Cotation.numero_cotation.ilike(f"%{search}%"))
    if resultat:
        q = q.where(Cotation.resultat == resultat)
    if statut_paiement:
        q = q.where(Cotation.statut_paiement == statut_paiement)
    if nature_operation:
        q = q.where(Cotation.nature_operation == nature_operation)
    if agent_commercial:
        q = q.where(Cotation.agent_commercial.ilike(f"%{agent_commercial}%"))
    if annee:
        q = q.where(func.extract("year", Cotation.date_cotation) == annee)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(
            q.order_by(Cotation.date_cotation.desc().nullslast(), Cotation.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.post("/", response_model=CotationOut, status_code=201)
async def create_cotation(data: CotationCreate, db: AsyncSession = Depends(get_db)):
    body = data.model_dump()
    body.pop("marge", None)
    # Auto-numérotation si absent
    if not body.get("numero_cotation"):
        annee = (data.date_cotation or date.today()).year
        body["numero_cotation"] = await _auto_numero(db, annee)
    cotation = Cotation(**body)
    _apply_marge(cotation)
    db.add(cotation)
    await db.commit()
    await db.refresh(cotation)
    return cotation


@router.get("/{cotation_id}", response_model=CotationOut)
async def get_cotation(cotation_id: int, db: AsyncSession = Depends(get_db)):
    cotation = await db.get(Cotation, cotation_id)
    if not cotation:
        raise HTTPException(404, detail="Cotation introuvable")
    return cotation


@router.put("/{cotation_id}", response_model=CotationOut)
async def update_cotation(
    cotation_id: int, data: CotationUpdate, db: AsyncSession = Depends(get_db)
):
    cotation = await db.get(Cotation, cotation_id)
    if not cotation:
        raise HTTPException(404, detail="Cotation introuvable")
    updates = data.model_dump(exclude_unset=True)
    updates.pop("marge", None)
    for k, v in updates.items():
        setattr(cotation, k, v)
    _apply_marge(cotation)
    await db.commit()
    await db.refresh(cotation)
    return cotation


@router.delete("/{cotation_id}", status_code=204)
async def delete_cotation(cotation_id: int, db: AsyncSession = Depends(get_db)):
    cotation = await db.get(Cotation, cotation_id)
    if not cotation:
        raise HTTPException(404, detail="Cotation introuvable")
    await db.delete(cotation)
    await db.commit()
