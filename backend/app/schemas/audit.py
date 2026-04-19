from datetime import date
from typing import Literal

from pydantic import BaseModel

TypeAudit  = Literal["INTERNE", "EXTERNE", "FISCAL", "SOCIAL", "OPERATIONNEL", "INFORMATIQUE", "QUALITE"]
StatutAudit = Literal["PLANIFIÉ", "EN COURS", "TERMINÉ", "SUIVI", "CLOS"]
Conformite  = Literal["CONFORME", "NON_CONFORME", "PARTIEL", "N/A"]
PrioriteAudit = Literal["P1", "P2", "P3"]


class AuditBase(BaseModel):
    reference:       str | None      = None
    date_audit:      date
    auditeur:        str | None      = None
    type_audit:      TypeAudit       = "INTERNE"
    domaine:         str | None      = None
    periode_debut:   date | None     = None
    periode_fin:     date | None     = None
    conformite:      Conformite      = "N/A"
    nb_observations: int | None      = None
    observations:    str | None      = None
    recommandations: str | None      = None
    plan_action:     str | None      = None
    statut:          StatutAudit     = "PLANIFIÉ"
    priorite:        PrioriteAudit   = "P3"
    notes:           str | None      = None


class AuditCreate(AuditBase):
    pass


class AuditUpdate(BaseModel):
    reference:       str | None           = None
    date_audit:      date | None          = None
    auditeur:        str | None           = None
    type_audit:      TypeAudit | None     = None
    domaine:         str | None           = None
    periode_debut:   date | None          = None
    periode_fin:     date | None          = None
    conformite:      Conformite | None    = None
    nb_observations: int | None           = None
    observations:    str | None           = None
    recommandations: str | None           = None
    plan_action:     str | None           = None
    statut:          StatutAudit | None   = None
    priorite:        PrioriteAudit | None = None
    notes:           str | None           = None


class AuditOut(AuditBase):
    id: int
    model_config = {"from_attributes": True}
