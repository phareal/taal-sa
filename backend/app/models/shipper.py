from sqlalchemy import BigInteger, CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Shipper(Base):
    __tablename__ = "shippers"
    __table_args__ = (
        CheckConstraint(
            "statut IN ('ACTIF','EN_DÉCLIN','PERDU')",
            name="ck_shippers_statut",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nom: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    pays: Mapped[str | None] = mapped_column(String(100), nullable=True)
    statut: Mapped[str] = mapped_column(String(20), default="ACTIF")
    ca_passe_fcfa: Mapped[int] = mapped_column(BigInteger, default=0)
    ca_actuel_fcfa: Mapped[int] = mapped_column(BigInteger, default=0)
    nb_bl_passe: Mapped[int] = mapped_column(Integer, default=0)
    nb_bl_actuel: Mapped[int] = mapped_column(Integer, default=0)
