from datetime import datetime
from typing import Literal

from pydantic import BaseModel

TypeOperation = Literal["IMPORT", "EXPORT"]


class ConnaissementBase(BaseModel):
    numero_bl: str | None = None
    navire_id: int | None = None
    shipper_id: int | None = None
    client_id: int | None = None
    annee: int
    mois: str | None = None
    mois_num: int | None = None
    quantite: str | None = None
    poids_kg: float | None = None
    volume_m3: float | None = None
    docs_fees_fcfa: int | None = None
    montant_normal_fcfa: int | None = None
    marge_fcfa: int | None = None
    taux_marge: float | None = None
    type_operation: TypeOperation = "IMPORT"
    notes: str | None = None


class ConnaissementCreate(ConnaissementBase):
    pass


class ConnaissementUpdate(BaseModel):
    numero_bl: str | None = None
    navire_id: int | None = None
    shipper_id: int | None = None
    client_id: int | None = None
    annee: int | None = None
    mois: str | None = None
    mois_num: int | None = None
    quantite: str | None = None
    poids_kg: float | None = None
    volume_m3: float | None = None
    docs_fees_fcfa: int | None = None
    montant_normal_fcfa: int | None = None
    marge_fcfa: int | None = None
    taux_marge: float | None = None
    type_operation: TypeOperation | None = None
    notes: str | None = None


class ConnaissementOut(ConnaissementBase):
    id: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
