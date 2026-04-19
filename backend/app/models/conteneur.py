from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Conteneur(Base):
    __tablename__ = "conteneurs"
    __table_args__ = (
        CheckConstraint(
            "type_tc IN ('TC20','TC40','TC40HC','TC45','VRAC','AUTRE')",
            name="ck_conteneurs_type_tc",
        ),
        CheckConstraint(
            "statut IN ('EN COURS','LIVRÉ','BLOQUÉ','EN ATTENTE')",
            name="ck_conteneurs_statut",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    numero_tc: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    type_tc: Mapped[str] = mapped_column(String(20), default="TC20")
    partenaire: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    navire_id: Mapped[int | None] = mapped_column(
        ForeignKey("navires.id", ondelete="SET NULL"), nullable=True
    )
    annee: Mapped[int] = mapped_column(Integer, index=True)
    mois_num: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mois: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_arrivee: Mapped[date | None] = mapped_column(Date, nullable=True)
    port_origine: Mapped[str | None] = mapped_column(String(150), nullable=True)
    port_destination: Mapped[str | None] = mapped_column(String(150), nullable=True)
    statut: Mapped[str] = mapped_column(String(20), default="EN COURS")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
