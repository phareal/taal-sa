from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Navire(Base):
    __tablename__ = "navires"

    id: Mapped[int] = mapped_column(primary_key=True)
    nom: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    compagnie: Mapped[str | None] = mapped_column(String(255), nullable=True)
    code_ligne: Mapped[str | None] = mapped_column(String(50), nullable=True)
    actif: Mapped[bool] = mapped_column(Boolean, default=True)
    # Partenaire armateur : BOCS, WACEM, DIAMOND CEMENT, MSC, CMA CGM…
    partenaire: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    type_navire: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Ex : CONTENEUR, VRAC, RORO, GENERAL_CARGO
