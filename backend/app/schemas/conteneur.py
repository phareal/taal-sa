from datetime import date
from typing import Literal

from pydantic import BaseModel

TypeTC        = Literal["TC20", "TC40", "TC40HC", "TC45", "VRAC", "AUTRE"]
StatutTC      = Literal["EN COURS", "LIVRÉ", "BLOQUÉ", "EN ATTENTE"]


class ConteneurBase(BaseModel):
    numero_tc:        str | None  = None
    type_tc:          TypeTC      = "TC20"
    partenaire:       str | None  = None
    navire_id:        int | None  = None
    annee:            int
    mois_num:         int | None  = None
    mois:             str | None  = None
    date_arrivee:     date | None = None
    port_origine:     str | None  = None
    port_destination: str | None  = None
    statut:           StatutTC    = "EN COURS"
    notes:            str | None  = None


class ConteneurCreate(ConteneurBase):
    pass


class ConteneurUpdate(BaseModel):
    numero_tc:        str | None    = None
    type_tc:          TypeTC | None = None
    partenaire:       str | None    = None
    navire_id:        int | None    = None
    annee:            int | None    = None
    mois_num:         int | None    = None
    mois:             str | None    = None
    date_arrivee:     date | None   = None
    port_origine:     str | None    = None
    port_destination: str | None    = None
    statut:           StatutTC | None = None
    notes:            str | None    = None


class ConteneurOut(ConteneurBase):
    id: int
    model_config = {"from_attributes": True}
