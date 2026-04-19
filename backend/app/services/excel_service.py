"""
Service d'import/export Excel pour TAAL SA.

Corrections appliquées à l'import :
- strip() sur navire, shipper, consignataire (espaces parasites)
- docs_fees < 1 000 FCFA → ×1 000 (2 valeurs aberrantes identifiées)
- marge recalculée si absente ou incohérente (marge ≠ docs_fees − montant_normal)
- taux_marge recalculé depuis marge/docs_fees
- N° B/L manquants → identifiant synthétique SYNTH-{NAV}-{ANNEE}-{IDX}
- Feuille 2026 : fusionnée avec la consolidée sur numero_bl (enrichit marge uniquement)
- type_operation = "IMPORT" par défaut (service NAT1)
- Upsert sur numero_bl (UPDATE si existe, INSERT sinon)
"""

from __future__ import annotations

import asyncio
import io
import re
from dataclasses import dataclass, field
from typing import Any

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.connaissement import Connaissement
from app.models.navire import Navire
from app.models.shipper import Shipper

SHEET_CONSOLIDEES = "📋 DONNÉES CONSOLIDÉES"
SHEET_2026 = "📈 2026 (MARGES)"

MOIS_FR: dict[str, int] = {
    "JANVIER": 1, "FEVRIER": 2, "FÉVRIER": 2, "MARS": 3, "AVRIL": 4,
    "MAI": 5, "JUIN": 6, "JUILLET": 7, "AOUT": 8, "AOÛT": 8,
    "SEPTEMBRE": 9, "OCTOBRE": 10, "NOVEMBRE": 11, "DECEMBRE": 12, "DÉCEMBRE": 12,
}


# ── Types ─────────────────────────────────────────────────────────────────────

@dataclass
class RowError:
    row: int
    numero_bl: str | None
    reason: str


@dataclass
class ImportResult:
    inserted: int = 0
    updated: int = 0
    errors: list[RowError] = field(default_factory=list)


# ── Helpers de nettoyage ──────────────────────────────────────────────────────

def _clean(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, float) and pd.isna(v):
        return None
    s = str(v).strip()
    return s or None


def _key(v: Any) -> str | None:
    s = _clean(v)
    return s.upper() if s else None


def _int(v: Any) -> int | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return int(round(float(str(v).replace(" ", "").replace("\xa0", ""))))
    except (TypeError, ValueError):
        return None


def _float(v: Any) -> float | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        return float(str(v).replace(" ", "").replace("\xa0", ""))
    except (TypeError, ValueError):
        return None


def _fix_docs_fees(v: int | None) -> int | None:
    """Corrige les valeurs aberrantes docs_fees < 1 000 FCFA (erreur de saisie ×1 000)."""
    if v is None:
        return None
    return v * 1000 if 0 < v < 1000 else v


def _compute_marge(
    docs_fees: int | None,
    montant_normal: int | None,
    marge_raw: int | None,
) -> tuple[int | None, float | None]:
    """
    Recalcule marge et taux_marge.
    - Si montant_normal absent → retourne marge_raw telle quelle
    - Si docs_fees − montant_normal cohérent → utilise le calcul
    - Taux plafonné à [0, 1] pour rejeter les valeurs > 100 %
    """
    if docs_fees is None or docs_fees == 0:
        return marge_raw, None
    if montant_normal is None:
        if marge_raw is not None and 0 < marge_raw <= docs_fees:
            return marge_raw, round(marge_raw / docs_fees, 4)
        return marge_raw, None

    marge_calc = docs_fees - montant_normal

    # Choisir entre calcul et valeur brute
    if marge_raw is None or marge_raw <= 0:
        marge = marge_calc if marge_calc > 0 else None
    else:
        # Si l'écart est > 5 % → on préfère le calcul
        ecart = abs(marge_calc - marge_raw) / max(abs(marge_calc), 1)
        marge = marge_calc if ecart > 0.05 else marge_raw

    if marge is None or marge <= 0 or marge > docs_fees:
        return None, None

    return marge, round(marge / docs_fees, 4)


def _synth_bl(navire: str | None, annee: int, idx: int) -> str:
    code = re.sub(r"[^A-Z0-9]", "", (navire or "UNK").upper())[:6]
    return f"SYNTH-{code}-{annee}-{idx:04d}"


# ── Parsing des feuilles ──────────────────────────────────────────────────────

def _parse_consolidees(xl: pd.ExcelFile) -> list[dict]:
    """Headers ligne 5 (index 4). Colonnes : N°|NAVIRE|BL|SHIPPER|CONSIG|QTE|POIDS|VOL|DOCS|MOIS|ANNEE"""
    df = xl.parse(SHEET_CONSOLIDEES, header=4, dtype=str)
    rows: list[dict] = []
    synth_idx = 0

    for _, r in df.iterrows():
        vals = r.tolist()
        if len(vals) < 11:
            continue
        annee = _int(vals[10])
        if annee is None:
            continue

        navire   = _clean(vals[1])
        bl       = _clean(vals[2])
        shipper  = _clean(vals[3])
        client   = _clean(vals[4])
        mois     = _clean(vals[9])
        mois_num = MOIS_FR.get(mois.upper()) if mois else None
        docs     = _fix_docs_fees(_int(vals[8]))

        if not bl:
            bl = _synth_bl(navire, annee, synth_idx)
            synth_idx += 1

        rows.append({
            "numero_bl":          bl,
            "navire_nom":         navire,
            "navire_key":         _key(navire),
            "shipper_nom":        shipper,
            "shipper_key":        _key(shipper),
            "client_nom":         client,
            "client_key":         _key(client),
            "annee":              annee,
            "mois":               mois,
            "mois_num":           mois_num,
            "quantite":           _clean(vals[5]),
            "poids_kg":           _float(vals[6]),
            "volume_m3":          _float(vals[7]),
            "docs_fees_fcfa":     docs,
            "montant_normal_fcfa":None,
            "marge_fcfa":         None,
            "taux_marge":         None,
            "type_operation":     "IMPORT",
        })
    return rows


def _parse_2026(xl: pd.ExcelFile) -> list[dict]:
    """Headers ligne 8 (index 7). Colonnes : N°|NAVIRE|BL|SHIPPER|CONSIG|QTE|POIDS|VOL|DOCS|MONTANT|MARGE|TAUX"""
    df = xl.parse(SHEET_2026, header=7, dtype=str)
    rows: list[dict] = []
    synth_idx = 0

    for _, r in df.iterrows():
        vals = r.tolist()
        if len(vals) < 9:
            continue

        navire  = _clean(vals[1])
        bl      = _clean(vals[2])
        shipper = _clean(vals[3])
        client  = _clean(vals[4])
        docs    = _fix_docs_fees(_int(vals[8]))

        if docs is None and navire is None and bl is None:
            continue

        montant = _int(vals[9]) if len(vals) > 9 else None
        marge_r = _int(vals[10]) if len(vals) > 10 else None
        marge, taux = _compute_marge(docs, montant, marge_r)

        if not bl:
            bl = _synth_bl(navire, 2026, synth_idx)
            synth_idx += 1

        rows.append({
            "numero_bl":          bl,
            "navire_nom":         navire,
            "navire_key":         _key(navire),
            "shipper_nom":        shipper,
            "shipper_key":        _key(shipper),
            "client_nom":         client,
            "client_key":         _key(client),
            "annee":              2026,
            "mois":               None,
            "mois_num":           None,
            "quantite":           _clean(vals[5]),
            "poids_kg":           _float(vals[6]),
            "volume_m3":          _float(vals[7]),
            "docs_fees_fcfa":     docs,
            "montant_normal_fcfa":montant,
            "marge_fcfa":         marge,
            "taux_marge":         taux,
            "type_operation":     "IMPORT",
        })
    return rows


def _merge(consolidees: list[dict], rows_2026: list[dict]) -> list[dict]:
    """
    Fusion : les B/L de la feuille 2026 qui existent déjà dans consolidées
    enrichissent l'entrée existante (marge uniquement).
    Les B/L nouveaux (propres à 2026) sont ajoutés à la liste.
    """
    index = {r["numero_bl"]: i for i, r in enumerate(consolidees) if r["numero_bl"]}

    for r26 in rows_2026:
        bl = r26["numero_bl"]
        if bl and bl in index:
            i = index[bl]
            consolidees[i]["montant_normal_fcfa"] = r26["montant_normal_fcfa"]
            consolidees[i]["marge_fcfa"]          = r26["marge_fcfa"]
            consolidees[i]["taux_marge"]          = r26["taux_marge"]
        else:
            consolidees.append(r26)
            if bl:
                index[bl] = len(consolidees) - 1

    return consolidees


def parse_file(content: bytes) -> list[dict]:
    """Synchrone — à appeler via asyncio.to_thread()."""
    buf = io.BytesIO(content)
    xl  = pd.ExcelFile(buf, engine="openpyxl")
    sheets = xl.sheet_names

    rows: list[dict] = []

    if SHEET_CONSOLIDEES in sheets:
        rows = _parse_consolidees(xl)

    if SHEET_2026 in sheets:
        rows_26 = _parse_2026(xl)
        rows = _merge(rows, rows_26)

    if not rows:
        available = ", ".join(sheets)
        raise ValueError(
            f"Aucune feuille de données reconnue. Feuilles disponibles : {available}"
        )

    return rows


# ── Résolution des entités (get or create) ────────────────────────────────────

async def _resolve_navire(db: AsyncSession, nom: str | None, cache: dict) -> int | None:
    if not nom:
        return None
    k = _key(nom)
    if k in cache:
        return cache[k]
    obj = (await db.execute(select(Navire).where(Navire.nom == nom))).scalar_one_or_none()
    if not obj:
        obj = Navire(nom=nom, actif=True)
        db.add(obj)
        await db.flush()
    cache[k] = obj.id
    return obj.id


async def _resolve_shipper(db: AsyncSession, nom: str | None, cache: dict) -> int | None:
    if not nom:
        return None
    k = _key(nom)
    if k in cache:
        return cache[k]
    obj = (await db.execute(select(Shipper).where(Shipper.nom == nom))).scalar_one_or_none()
    if not obj:
        obj = Shipper(nom=nom, statut="ACTIF")
        db.add(obj)
        await db.flush()
    cache[k] = obj.id
    return obj.id


async def _resolve_client(db: AsyncSession, nom: str | None, cache: dict) -> int | None:
    if not nom:
        return None
    k = _key(nom)
    if k in cache:
        return cache[k]
    obj = (await db.execute(select(Client).where(Client.nom == nom))).scalar_one_or_none()
    if not obj:
        obj = Client(nom=nom)
        db.add(obj)
        await db.flush()
    cache[k] = obj.id
    return obj.id


# ── Import principal (async) ──────────────────────────────────────────────────

async def import_excel(content: bytes, db: AsyncSession) -> ImportResult:
    """
    Parse l'Excel et effectue un upsert complet dans la BDD.
    Retourne { inserted, updated, errors }.
    """
    rows = await asyncio.to_thread(parse_file, content)

    result = ImportResult()
    nav_cache: dict[str, int] = {}
    shp_cache: dict[str, int] = {}
    cli_cache: dict[str, int] = {}

    for i, row in enumerate(rows):
        try:
            navire_id  = await _resolve_navire( db, row["navire_nom"],  nav_cache)
            shipper_id = await _resolve_shipper(db, row["shipper_nom"], shp_cache)
            client_id  = await _resolve_client( db, row["client_nom"],  cli_cache)

            bl_data = {
                "numero_bl":           row["numero_bl"],
                "navire_id":           navire_id,
                "shipper_id":          shipper_id,
                "client_id":           client_id,
                "annee":               row["annee"],
                "mois":                row["mois"],
                "mois_num":            row["mois_num"],
                "quantite":            row["quantite"],
                "poids_kg":            row["poids_kg"],
                "volume_m3":           row["volume_m3"],
                "docs_fees_fcfa":      row["docs_fees_fcfa"],
                "montant_normal_fcfa": row["montant_normal_fcfa"],
                "marge_fcfa":          row["marge_fcfa"],
                "taux_marge":          row["taux_marge"],
                "type_operation":      row["type_operation"],
            }

            existing = (
                await db.execute(
                    select(Connaissement).where(
                        Connaissement.numero_bl == row["numero_bl"]
                    )
                )
            ).scalar_one_or_none()

            if existing:
                for k, v in bl_data.items():
                    setattr(existing, k, v)
                result.updated += 1
            else:
                db.add(Connaissement(**bl_data))
                result.inserted += 1

        except Exception as exc:
            result.errors.append(
                RowError(row=i + 1, numero_bl=row.get("numero_bl"), reason=str(exc))
            )

    await db.commit()
    return result


# ── Export Excel ──────────────────────────────────────────────────────────────

def build_export(rows: list[dict]) -> bytes:
    """Construit un fichier XLSX depuis une liste de dicts (résultat de la requête ORM)."""
    df = pd.DataFrame(rows)

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="xlsxwriter") as writer:
        df.to_excel(writer, index=False, sheet_name="Connaissements")
        wb  = writer.book
        ws  = writer.sheets["Connaissements"]

        # Formats
        header_fmt = wb.add_format({
            "bold": True, "bg_color": "#1e2330", "font_color": "#c9975a",
            "border": 1, "border_color": "#3a3f52",
        })
        money_fmt = wb.add_format({"num_format": "#,##0", "align": "right"})
        pct_fmt   = wb.add_format({"num_format": "0.00%"})

        for col_num, col_name in enumerate(df.columns):
            ws.write(0, col_num, col_name, header_fmt)
            # Largeur auto approximative
            width = max(len(str(col_name)), 10)
            ws.set_column(col_num, col_num, width)

        # Colonnes monétaires
        money_cols = {"docs_fees_fcfa", "montant_normal_fcfa", "marge_fcfa"}
        pct_cols   = {"taux_marge"}
        for col_num, col_name in enumerate(df.columns):
            if col_name in money_cols:
                ws.set_column(col_num, col_num, 16, money_fmt)
            elif col_name in pct_cols:
                ws.set_column(col_num, col_num, 10, pct_fmt)

    return buf.getvalue()
