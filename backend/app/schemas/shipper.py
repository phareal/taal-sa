from pydantic import BaseModel
from typing import Literal


ShipperStatut = Literal["ACTIF", "EN_DÉCLIN", "PERDU"]


class ShipperBase(BaseModel):
    nom: str
    pays: str | None = None
    statut: ShipperStatut = "ACTIF"
    ca_passe_fcfa: int = 0
    ca_actuel_fcfa: int = 0
    nb_bl_passe: int = 0
    nb_bl_actuel: int = 0


class ShipperCreate(ShipperBase):
    pass


class ShipperUpdate(BaseModel):
    nom: str | None = None
    pays: str | None = None
    statut: ShipperStatut | None = None
    ca_passe_fcfa: int | None = None
    ca_actuel_fcfa: int | None = None
    nb_bl_passe: int | None = None
    nb_bl_actuel: int | None = None


class ShipperOut(ShipperBase):
    id: int
    model_config = {"from_attributes": True}
