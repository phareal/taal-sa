from pydantic import BaseModel


class ClientBase(BaseModel):
    nom: str
    secteur: str | None = None
    pays: str | None = None
    email: str | None = None
    telephone: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    nom: str | None = None
    secteur: str | None = None
    pays: str | None = None
    email: str | None = None
    telephone: str | None = None


class ClientOut(ClientBase):
    id: int
    model_config = {"from_attributes": True}
