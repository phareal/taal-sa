from datetime import date
from typing import Literal

from pydantic import BaseModel

CotationResultat  = Literal["GAGNÉ", "PERDU", "EN COURS", "ANNULÉ"]
StatutPaiement    = Literal["PAYÉ", "EN ATTENTE", "PARTIEL"]
NatureOperation   = Literal[
    "MARITIME_LCL", "MARITIME_FCL",
    "AERIEN", "ROUTIER",
    "TRANSIT", "ENTREPOSAGE",
    "CONSIGNATION", "DIVERS"
]


class CotationBase(BaseModel):
    numero_cotation:      str | None       = None  # auto-généré si absent
    date_cotation:        date | None      = None
    client_id:            int | None       = None
    nature_operation:     NatureOperation | None = None
    type_service:         str | None       = None
    offre_transitaire:    float | None     = None
    cotation_client:      float | None     = None
    marge:                float | None     = None
    devise:               str              = "EUR"
    resultat:             CotationResultat = "EN COURS"
    observations:         str | None       = None
    agent_commercial:     str | None       = None
    montant_facture_fcfa: int | None       = None
    date_facture:         date | None      = None
    statut_paiement:      StatutPaiement   = "EN ATTENTE"


class CotationCreate(CotationBase):
    pass


class CotationUpdate(BaseModel):
    numero_cotation:      str | None           = None
    date_cotation:        date | None          = None
    client_id:            int | None           = None
    nature_operation:     NatureOperation | None = None
    type_service:         str | None           = None
    offre_transitaire:    float | None         = None
    cotation_client:      float | None         = None
    marge:                float | None         = None
    devise:               str | None           = None
    resultat:             CotationResultat | None = None
    observations:         str | None           = None
    agent_commercial:     str | None           = None
    montant_facture_fcfa: int | None           = None
    date_facture:         date | None          = None
    statut_paiement:      StatutPaiement | None = None


class CotationOut(CotationBase):
    id: int
    numero_cotation: str  # toujours présent en sortie
    model_config = {"from_attributes": True}
