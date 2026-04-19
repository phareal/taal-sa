from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Connaissement(Base):
    __tablename__ = "connaissements"
    __table_args__ = (
        CheckConstraint(
            "type_operation IN ('IMPORT','EXPORT')",
            name="ck_connaissements_type_operation",
        ),
        Index("ix_connaissements_annee_mois", "annee", "mois_num"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    numero_bl: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)

    navire_id: Mapped[int | None] = mapped_column(
        ForeignKey("navires.id", ondelete="SET NULL"), nullable=True
    )
    shipper_id: Mapped[int | None] = mapped_column(
        ForeignKey("shippers.id", ondelete="SET NULL"), nullable=True
    )
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )

    annee: Mapped[int] = mapped_column(Integer, index=True)
    mois: Mapped[str | None] = mapped_column(String(20), nullable=True)
    mois_num: Mapped[int | None] = mapped_column(Integer, nullable=True)

    quantite: Mapped[str | None] = mapped_column(String(100), nullable=True)
    poids_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume_m3: Mapped[float | None] = mapped_column(Float, nullable=True)

    docs_fees_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    montant_normal_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    marge_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    taux_marge: Mapped[float | None] = mapped_column(Float, nullable=True)

    type_operation: Mapped[str] = mapped_column(String(10), default="IMPORT")
    # Type de transport : MARITIME_LCL (défaut), MARITIME_FCL, AERIEN, ROUTIER, TRANSIT…
    type_transport: Mapped[str] = mapped_column(String(30), default="MARITIME_LCL")
    # Lien vers le conteneur (groupage LCL ou FCL)
    conteneur_id: Mapped[int | None] = mapped_column(
        ForeignKey("conteneurs.id", ondelete="SET NULL"), nullable=True
    )
    # Frais additionnels
    frais_douane: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    frais_manutention: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
