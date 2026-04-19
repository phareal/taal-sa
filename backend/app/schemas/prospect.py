from datetime import date
from typing import Literal

from pydantic import BaseModel

Priorite = Literal["P1", "P2", "P3"]


class ProspectBase(BaseModel):
    client_id: int
    type_statut: str | None = None
    priorite: Priorite = "P3"
    ca_pic_fcfa: int = 0
    ca_derniere_fcfa: int = 0
    annee_derniere_op: int | None = None
    action_prevue: str | None = None
    date_relance: date | None = None
    statut_relance: str | None = None
    notes: str | None = None


class ProspectCreate(ProspectBase):
    pass


class ProspectUpdate(BaseModel):
    type_statut: str | None = None
    priorite: Priorite | None = None
    ca_pic_fcfa: int | None = None
    ca_derniere_fcfa: int | None = None
    annee_derniere_op: int | None = None
    action_prevue: str | None = None
    date_relance: date | None = None
    statut_relance: str | None = None
    notes: str | None = None


class ProspectOut(ProspectBase):
    id: int
    model_config = {"from_attributes": True}
