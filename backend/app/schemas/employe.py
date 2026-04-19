from datetime import date
from typing import Literal

from pydantic import BaseModel

EmployeStatut = Literal["ACTIF", "INACTIF", "CONGÉ", "SUSPENDU"]
Departement   = Literal["DIRECTION", "COMMERCIAL", "OPERATIONS", "FINANCE", "RH", "INFORMATIQUE", "LOGISTIQUE", "DIVERS"]


class EmployeBase(BaseModel):
    matricule:         str | None       = None
    nom:               str
    prenom:            str | None       = None
    poste:             str | None       = None
    departement:       Departement      = "DIVERS"
    email:             str | None       = None
    telephone:         str | None       = None
    date_embauche:     date | None      = None
    salaire_base_fcfa: int | None       = None
    statut:            EmployeStatut    = "ACTIF"
    notes:             str | None       = None


class EmployeCreate(EmployeBase):
    pass


class EmployeUpdate(BaseModel):
    matricule:         str | None       = None
    nom:               str | None       = None
    prenom:            str | None       = None
    poste:             str | None       = None
    departement:       Departement | None = None
    email:             str | None       = None
    telephone:         str | None       = None
    date_embauche:     date | None      = None
    salaire_base_fcfa: int | None       = None
    statut:            EmployeStatut | None = None
    notes:             str | None       = None


class EmployeOut(EmployeBase):
    id: int
    model_config = {"from_attributes": True}


# ── PerformanceRH ─────────────────────────────────────────────────────────────

class PerformanceBase(BaseModel):
    employe_id:           int
    annee:                int
    nb_dossiers_traites:  int | None   = None
    ca_genere_fcfa:       int | None   = None
    objectif_ca_fcfa:     int | None   = None
    taux_realisation:     float | None = None
    nb_clients_nouveaux:  int | None   = None
    nb_reclamations:      int | None   = None
    prime_fcfa:           int | None   = None
    evaluation:           int | None   = None
    commentaires:         str | None   = None


class PerformanceCreate(PerformanceBase):
    pass


class PerformanceUpdate(BaseModel):
    nb_dossiers_traites: int | None   = None
    ca_genere_fcfa:      int | None   = None
    objectif_ca_fcfa:    int | None   = None
    taux_realisation:    float | None = None
    nb_clients_nouveaux: int | None   = None
    nb_reclamations:     int | None   = None
    prime_fcfa:          int | None   = None
    evaluation:          int | None   = None
    commentaires:        str | None   = None


class PerformanceOut(PerformanceBase):
    id: int
    model_config = {"from_attributes": True}
