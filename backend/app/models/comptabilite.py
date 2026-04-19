from datetime import date

from sqlalchemy import BigInteger, CheckConstraint, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ComptabiliteEntry(Base):
    __tablename__ = "comptabilite"
    __table_args__ = (
        CheckConstraint(
            "type_operation IN ('RECETTE','DEPENSE')",
            name="ck_comptabilite_type",
        ),
        CheckConstraint(
            "statut_paiement IN ('PAYÉ','EN ATTENTE','PARTIEL','ANNULÉ')",
            name="ck_comptabilite_statut_paiement",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    date_op: Mapped[date] = mapped_column(Date, index=True)
    libelle: Mapped[str] = mapped_column(String(500))
    type_operation: Mapped[str] = mapped_column(String(20))  # RECETTE | DEPENSE

    # Catégorie métier
    categorie: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Ex: FRET, MANUTENTION, DOUANE, TRANSIT, ENTREPOSAGE, HONORAIRES,
    #     SALAIRES, CHARGES_SOCIALES, LOYER, FOURNITURES, CARBURANT, DIVERS

    montant_fcfa: Mapped[int] = mapped_column(BigInteger, default=0)
    devise: Mapped[str] = mapped_column(String(10), default="XOF")
    taux_change: Mapped[float | None] = mapped_column(Float, nullable=True)
    montant_devise: Mapped[float | None] = mapped_column(Float, nullable=True)

    reference_doc: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    connaissement_id: Mapped[int | None] = mapped_column(
        ForeignKey("connaissements.id", ondelete="SET NULL"), nullable=True
    )

    statut_paiement: Mapped[str] = mapped_column(String(20), default="EN ATTENTE")
    date_echeance: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_paiement: Mapped[date | None] = mapped_column(Date, nullable=True)

    service: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
