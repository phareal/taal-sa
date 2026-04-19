from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.connaissement import Connaissement
from app.models.conteneur import Conteneur
from app.schemas.common import Paginated
from app.schemas.conteneur import ConteneurCreate, ConteneurOut, ConteneurUpdate

router = APIRouter(prefix="/api/conteneurs", tags=["conteneurs"])


# ── Stats par conteneur (nb BL, CA, marges…) ─────────────────────────────────

class ConteneurStatsOut(BaseModel):
    conteneur_id: int
    numero_tc: str | None
    type_tc: str
    partenaire: str | None
    annee: int
    mois: str | None
    statut: str
    nb_bl: int
    nb_clients: int
    ca_total_fcfa: int
    marge_total_fcfa: int | None
    poids_kg: float
    volume_m3: float


@router.get("/", response_model=Paginated[ConteneurOut])
async def list_conteneurs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    annee: int | None = Query(None),
    mois_num: int | None = Query(None),
    partenaire: str | None = Query(None),
    statut: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Conteneur)
    if annee:
        q = q.where(Conteneur.annee == annee)
    if mois_num:
        q = q.where(Conteneur.mois_num == mois_num)
    if partenaire:
        q = q.where(Conteneur.partenaire.ilike(f"%{partenaire}%"))
    if statut:
        q = q.where(Conteneur.statut == statut)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    items = (
        await db.execute(
            q.order_by(Conteneur.annee.desc(), Conteneur.mois_num.desc(), Conteneur.id.desc())
             .offset((page - 1) * page_size).limit(page_size)
        )
    ).scalars().all()

    return Paginated.build(items=list(items), total=total, page=page, page_size=page_size)


@router.get("/stats", response_model=list[ConteneurStatsOut])
async def get_conteneur_stats(
    annee: int | None = Query(None),
    mois_num: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[ConteneurStatsOut]:
    q_filters = [Connaissement.conteneur_id.isnot(None)]
    c_filters = []
    if annee:
        c_filters.append(Conteneur.annee == annee)
        q_filters.append(Connaissement.annee == annee)
    if mois_num:
        c_filters.append(Conteneur.mois_num == mois_num)

    conteneurs = (
        await db.execute(
            select(Conteneur).where(*c_filters).order_by(Conteneur.annee.desc(), Conteneur.mois_num.desc())
        )
    ).scalars().all()

    result = []
    for tc in conteneurs:
        bl_rows = (
            await db.execute(
                select(
                    func.count(Connaissement.id).label("nb_bl"),
                    func.count(func.distinct(Connaissement.client_id)).label("nb_clients"),
                    func.coalesce(func.sum(Connaissement.docs_fees_fcfa), 0).label("ca_total"),
                    func.sum(Connaissement.marge_fcfa).label("marge_total"),
                    func.coalesce(func.sum(Connaissement.poids_kg), 0).label("poids_kg"),
                    func.coalesce(func.sum(Connaissement.volume_m3), 0).label("volume_m3"),
                ).where(Connaissement.conteneur_id == tc.id)
            )
        ).one()

        result.append(ConteneurStatsOut(
            conteneur_id=tc.id,
            numero_tc=tc.numero_tc,
            type_tc=tc.type_tc,
            partenaire=tc.partenaire,
            annee=tc.annee,
            mois=tc.mois,
            statut=tc.statut,
            nb_bl=int(bl_rows.nb_bl or 0),
            nb_clients=int(bl_rows.nb_clients or 0),
            ca_total_fcfa=int(bl_rows.ca_total or 0),
            marge_total_fcfa=int(bl_rows.marge_total) if bl_rows.marge_total is not None else None,
            poids_kg=float(bl_rows.poids_kg or 0),
            volume_m3=float(bl_rows.volume_m3 or 0),
        ))

    return result


@router.post("/", response_model=ConteneurOut, status_code=201)
async def create_conteneur(data: ConteneurCreate, db: AsyncSession = Depends(get_db)):
    tc = Conteneur(**data.model_dump())
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc


@router.get("/{tc_id}", response_model=ConteneurOut)
async def get_conteneur(tc_id: int, db: AsyncSession = Depends(get_db)):
    tc = await db.get(Conteneur, tc_id)
    if not tc:
        raise HTTPException(404, detail="Conteneur introuvable")
    return tc


@router.put("/{tc_id}", response_model=ConteneurOut)
async def update_conteneur(tc_id: int, data: ConteneurUpdate, db: AsyncSession = Depends(get_db)):
    tc = await db.get(Conteneur, tc_id)
    if not tc:
        raise HTTPException(404, detail="Conteneur introuvable")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(tc, k, v)
    await db.commit()
    await db.refresh(tc)
    return tc


@router.delete("/{tc_id}", status_code=204)
async def delete_conteneur(tc_id: int, db: AsyncSession = Depends(get_db)):
    tc = await db.get(Conteneur, tc_id)
    if not tc:
        raise HTTPException(404, detail="Conteneur introuvable")
    await db.delete(tc)
    await db.commit()
