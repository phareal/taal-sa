from datetime import date
from typing import Literal

from pydantic import BaseModel

TypeOperation   = Literal["RECETTE", "DEPENSE"]
StatutPaiement  = Literal["PAYÉ", "EN ATTENTE", "PARTIEL", "ANNULÉ"]


class ComptabiliteBase(BaseModel):
    date_op:           date
    libelle:           str
    type_operation:    TypeOperation
    categorie:         str | None       = None
    montant_fcfa:      int              = 0
    devise:            str              = "XOF"
    taux_change:       float | None     = None
    montant_devise:    float | None     = None
    reference_doc:     str | None       = None
    client_id:         int | None       = None
    connaissement_id:  int | None       = None
    statut_paiement:   StatutPaiement   = "EN ATTENTE"
    date_echeance:     date | None      = None
    date_paiement:     date | None      = None
    service:           str | None       = None
    notes:             str | None       = None


class ComptabiliteCreate(ComptabiliteBase):
    pass


class ComptabiliteUpdate(BaseModel):
    date_op:          date | None             = None
    libelle:          str | None              = None
    type_operation:   TypeOperation | None    = None
    categorie:        str | None              = None
    montant_fcfa:     int | None              = None
    devise:           str | None              = None
    taux_change:      float | None            = None
    montant_devise:   float | None            = None
    reference_doc:    str | None              = None
    client_id:        int | None              = None
    connaissement_id: int | None              = None
    statut_paiement:  StatutPaiement | None   = None
    date_echeance:    date | None             = None
    date_paiement:    date | None             = None
    service:          str | None              = None
    notes:            str | None              = None


class ComptabiliteOut(ComptabiliteBase):
    id: int
    model_config = {"from_attributes": True}
