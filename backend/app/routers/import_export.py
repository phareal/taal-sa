from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.client import Client
from app.models.connaissement import Connaissement
from app.models.navire import Navire
from app.models.shipper import Shipper
from app.services.excel_service import ImportResult, RowError, build_export, import_excel

router = APIRouter(prefix="/api", tags=["import-export"])

MAX_SIZE = 50 * 1024 * 1024  # 50 MB


class RowErrorOut(BaseModel):
    row: int
    numero_bl: str | None
    reason: str


class ImportResultOut(BaseModel):
    inserted: int
    updated: int
    errors: list[RowErrorOut]


# ── POST /api/import/excel ────────────────────────────────────────────────────

@router.post("/import/excel", response_model=ImportResultOut)
async def import_excel_endpoint(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> ImportResultOut:
    if file.content_type not in (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/octet-stream",
    ):
        raise HTTPException(status_code=400, detail="Format de fichier non supporté. Utilisez .xlsx")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 50 Mo)")

    try:
        result: ImportResult = await import_excel(content, db)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ImportResultOut(
        inserted=result.inserted,
        updated=result.updated,
        errors=[RowErrorOut(row=e.row, numero_bl=e.numero_bl, reason=e.reason) for e in result.errors],
    )


# ── GET /api/export/excel ─────────────────────────────────────────────────────

@router.get("/export/excel")
async def export_excel_endpoint(
    annee: int | None = Query(None),
    mois_num: int | None = Query(None),
    navire_id: int | None = Query(None),
    client_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Response:
    filters = []
    if annee is not None:
        filters.append(Connaissement.annee == annee)
    if mois_num is not None:
        filters.append(Connaissement.mois_num == mois_num)
    if navire_id is not None:
        filters.append(Connaissement.navire_id == navire_id)
    if client_id is not None:
        filters.append(Connaissement.client_id == client_id)

    rows_orm = (
        await db.execute(
            select(
                Connaissement,
                Navire.nom.label("navire_nom"),
                Shipper.nom.label("shipper_nom"),
                Client.nom.label("client_nom"),
            )
            .outerjoin(Navire, Connaissement.navire_id == Navire.id)
            .outerjoin(Shipper, Connaissement.shipper_id == Shipper.id)
            .outerjoin(Client, Connaissement.client_id == Client.id)
            .where(*filters)
            .order_by(Connaissement.annee, Connaissement.mois_num, Connaissement.id)
        )
    ).all()

    rows = [
        {
            "numero_bl":           r.Connaissement.numero_bl,
            "navire":              r.navire_nom,
            "shipper":             r.shipper_nom,
            "client":              r.client_nom,
            "annee":               r.Connaissement.annee,
            "mois":                r.Connaissement.mois,
            "mois_num":            r.Connaissement.mois_num,
            "quantite":            r.Connaissement.quantite,
            "poids_kg":            r.Connaissement.poids_kg,
            "volume_m3":           r.Connaissement.volume_m3,
            "docs_fees_fcfa":      r.Connaissement.docs_fees_fcfa,
            "montant_normal_fcfa": r.Connaissement.montant_normal_fcfa,
            "marge_fcfa":          r.Connaissement.marge_fcfa,
            "taux_marge":          r.Connaissement.taux_marge,
            "type_operation":      r.Connaissement.type_operation,
            "notes":               r.Connaissement.notes,
        }
        for r in rows_orm
    ]

    xlsx_bytes = build_export(rows)

    filename = "connaissements"
    if annee:
        filename += f"_{annee}"
    if mois_num:
        filename += f"_m{mois_num:02d}"
    filename += ".xlsx"

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
