from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.client import Client
from app.models.connaissement import Connaissement
from app.models.navire import Navire
from app.models.shipper import Shipper

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class KpiOut(BaseModel):
    annee: int | None
    mois_num: int | None
    ca_total: int
    nb_bl: int
    nb_clients: int
    volume_m3: float
    poids_kg: float
    marge_fcfa: int | None
    taux_marge_moyen: float | None
    ca_moy_par_bl: int | None


class CaAnnuelRow(BaseModel):
    annee: int
    ca: int
    nb_bl: int
    volume_m3: float
    poids_kg: float


class CaMensuelRow(BaseModel):
    annee: int
    mois_num: int
    ca: int
    nb_bl: int


class CaParClientRow(BaseModel):
    client_id: int
    nom: str
    ca_total: int
    nb_bl: int


class CaParNavireRow(BaseModel):
    navire_id: int
    nom: str
    ca_total: int
    nb_bl: int


class ShipperRisqueRow(BaseModel):
    id: int
    nom: str
    statut: str
    ca_actuel_fcfa: int
    ca_passe_fcfa: int
    evolution_pct: float | None


# ── /kpis ────────────────────────────────────────────────────────────────────

@router.get("/kpis", response_model=KpiOut)
async def get_kpis(
    annee: int | None = Query(None),
    mois_num: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> KpiOut:
    filters = []
    if annee is not None:
        filters.append(Connaissement.annee == annee)
    if mois_num is not None:
        filters.append(Connaissement.mois_num == mois_num)

    row = (
        await db.execute(
            select(
                func.coalesce(func.sum(Connaissement.docs_fees_fcfa), 0).label("ca_total"),
                func.count(Connaissement.id).label("nb_bl"),
                func.count(func.distinct(Connaissement.client_id)).label("nb_clients"),
                func.coalesce(func.sum(Connaissement.volume_m3), 0).label("volume_m3"),
                func.coalesce(func.sum(Connaissement.poids_kg), 0).label("poids_kg"),
                func.sum(Connaissement.marge_fcfa).label("marge_fcfa"),
                func.avg(Connaissement.taux_marge).label("taux_marge_moyen"),
            ).where(*filters)
        )
    ).one()

    ca_total = int(row.ca_total or 0)
    nb_bl = int(row.nb_bl or 0)
    return KpiOut(
        annee=annee,
        mois_num=mois_num,
        ca_total=ca_total,
        nb_bl=nb_bl,
        nb_clients=int(row.nb_clients or 0),
        volume_m3=float(row.volume_m3 or 0),
        poids_kg=float(row.poids_kg or 0),
        marge_fcfa=int(row.marge_fcfa) if row.marge_fcfa is not None else None,
        taux_marge_moyen=float(row.taux_marge_moyen) if row.taux_marge_moyen is not None else None,
        ca_moy_par_bl=ca_total // nb_bl if nb_bl else None,
    )


# ── /ca-annuel ───────────────────────────────────────────────────────────────

@router.get("/ca-annuel", response_model=list[CaAnnuelRow])
async def get_ca_annuel(db: AsyncSession = Depends(get_db)) -> list[CaAnnuelRow]:
    rows = (
        await db.execute(
            select(
                Connaissement.annee,
                func.coalesce(func.sum(Connaissement.docs_fees_fcfa), 0).label("ca"),
                func.count(Connaissement.id).label("nb_bl"),
                func.coalesce(func.sum(Connaissement.volume_m3), 0).label("volume_m3"),
                func.coalesce(func.sum(Connaissement.poids_kg), 0).label("poids_kg"),
            )
            .group_by(Connaissement.annee)
            .order_by(Connaissement.annee)
        )
    ).all()

    return [
        CaAnnuelRow(
            annee=r.annee,
            ca=int(r.ca or 0),
            nb_bl=int(r.nb_bl or 0),
            volume_m3=float(r.volume_m3 or 0),
            poids_kg=float(r.poids_kg or 0),
        )
        for r in rows
    ]


# ── /ca-mensuel ──────────────────────────────────────────────────────────────

@router.get("/ca-mensuel", response_model=list[CaMensuelRow])
async def get_ca_mensuel(
    annees: list[int] = Query(default=[]),
    db: AsyncSession = Depends(get_db),
) -> list[CaMensuelRow]:
    q = select(
        Connaissement.annee,
        Connaissement.mois_num,
        func.coalesce(func.sum(Connaissement.docs_fees_fcfa), 0).label("ca"),
        func.count(Connaissement.id).label("nb_bl"),
    ).where(Connaissement.mois_num.isnot(None))

    if annees:
        q = q.where(Connaissement.annee.in_(annees))

    rows = (
        await db.execute(
            q.group_by(Connaissement.annee, Connaissement.mois_num)
            .order_by(Connaissement.annee, Connaissement.mois_num)
        )
    ).all()

    return [
        CaMensuelRow(
            annee=r.annee,
            mois_num=int(r.mois_num),
            ca=int(r.ca or 0),
            nb_bl=int(r.nb_bl or 0),
        )
        for r in rows
    ]


# ── /ca-par-client ────────────────────────────────────────────────────────────

@router.get("/ca-par-client", response_model=list[CaParClientRow])
async def get_ca_par_client(
    annee: int | None = Query(None),
    mois_num: int | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[CaParClientRow]:
    filters = [Connaissement.client_id.isnot(None)]
    if annee is not None:
        filters.append(Connaissement.annee == annee)
    if mois_num is not None:
        filters.append(Connaissement.mois_num == mois_num)

    rows = (
        await db.execute(
            select(
                Connaissement.client_id,
                Client.nom,
                func.coalesce(func.sum(Connaissement.docs_fees_fcfa), 0).label("ca_total"),
                func.count(Connaissement.id).label("nb_bl"),
            )
            .join(Client, Connaissement.client_id == Client.id, isouter=True)
            .where(*filters)
            .group_by(Connaissement.client_id, Client.nom)
            .order_by(func.sum(Connaissement.docs_fees_fcfa).desc())
            .limit(limit)
        )
    ).all()

    return [
        CaParClientRow(
            client_id=int(r.client_id),
            nom=r.nom or f"Client #{r.client_id}",
            ca_total=int(r.ca_total or 0),
            nb_bl=int(r.nb_bl or 0),
        )
        for r in rows
    ]


# ── /ca-par-navire ────────────────────────────────────────────────────────────

@router.get("/ca-par-navire", response_model=list[CaParNavireRow])
async def get_ca_par_navire(
    annee: int | None = Query(None),
    mois_num: int | None = Query(None),
    limit: int = Query(12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[CaParNavireRow]:
    filters = [Connaissement.navire_id.isnot(None)]
    if annee is not None:
        filters.append(Connaissement.annee == annee)
    if mois_num is not None:
        filters.append(Connaissement.mois_num == mois_num)

    rows = (
        await db.execute(
            select(
                Connaissement.navire_id,
                Navire.nom,
                func.coalesce(func.sum(Connaissement.docs_fees_fcfa), 0).label("ca_total"),
                func.count(Connaissement.id).label("nb_bl"),
            )
            .join(Navire, Connaissement.navire_id == Navire.id, isouter=True)
            .where(*filters)
            .group_by(Connaissement.navire_id, Navire.nom)
            .order_by(func.sum(Connaissement.docs_fees_fcfa).desc())
            .limit(limit)
        )
    ).all()

    return [
        CaParNavireRow(
            navire_id=int(r.navire_id),
            nom=r.nom or f"Navire #{r.navire_id}",
            ca_total=int(r.ca_total or 0),
            nb_bl=int(r.nb_bl or 0),
        )
        for r in rows
    ]


# ── /shippers-risque ──────────────────────────────────────────────────────────

@router.get("/shippers-risque", response_model=list[ShipperRisqueRow])
async def get_shippers_risque(
    limit: int = Query(15, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[ShipperRisqueRow]:
    rows = (
        await db.execute(
            select(Shipper)
            .where(Shipper.statut.in_(["EN_DÉCLIN", "PERDU"]))
            .order_by(Shipper.ca_passe_fcfa.desc())
            .limit(limit)
        )
    ).scalars().all()

    result = []
    for s in rows:
        if s.ca_passe_fcfa and s.ca_passe_fcfa > 0:
            evolution = ((s.ca_actuel_fcfa - s.ca_passe_fcfa) / s.ca_passe_fcfa) * 100
        else:
            evolution = None
        result.append(
            ShipperRisqueRow(
                id=s.id,
                nom=s.nom,
                statut=s.statut,
                ca_actuel_fcfa=s.ca_actuel_fcfa,
                ca_passe_fcfa=s.ca_passe_fcfa,
                evolution_pct=round(evolution, 1) if evolution is not None else None,
            )
        )
    return result
