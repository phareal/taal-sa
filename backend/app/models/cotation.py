from datetime import date

from sqlalchemy import BigInteger, CheckConstraint, Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Cotation(Base):
    __tablename__ = "cotations"
    __table_args__ = (
        CheckConstraint(
            "resultat IN ('GAGNÉ','PERDU','EN COURS','ANNULÉ')",
            name="ck_cotations_resultat",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    numero_cotation: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    date_cotation: Mapped[date | None] = mapped_column(Date, nullable=True)

    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )

    type_service: Mapped[str | None] = mapped_column(String(50), nullable=True)
    offre_transitaire: Mapped[float | None] = mapped_column(Float, nullable=True)
    cotation_client: Mapped[float | None] = mapped_column(Float, nullable=True)
    marge: Mapped[float | None] = mapped_column(Float, nullable=True)
    devise: Mapped[str] = mapped_column(String(10), default="EUR")

    resultat: Mapped[str] = mapped_column(String(20), default="EN COURS")
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_commercial: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Nature de l'opération : MARITIME_LCL, MARITIME_FCL, AERIEN, ROUTIER, TRANSIT, ENTREPOSAGE…
    nature_operation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Facturation et paiement
    montant_facture_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    date_facture: Mapped[date | None] = mapped_column(Date, nullable=True)
    statut_paiement: Mapped[str] = mapped_column(String(20), default="EN ATTENTE")
