from pydantic import BaseModel


class NavireBase(BaseModel):
    nom: str
    compagnie: str | None = None
    code_ligne: str | None = None
    actif: bool = True


class NavireCreate(NavireBase):
    pass


class NavireUpdate(BaseModel):
    nom: str | None = None
    compagnie: str | None = None
    code_ligne: str | None = None
    actif: bool | None = None


class NavireOut(NavireBase):
    id: int
    model_config = {"from_attributes": True}
