from datetime import date

from sqlalchemy import BigInteger, CheckConstraint, Date, Float, Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Employe(Base):
    __tablename__ = "employes"
    __table_args__ = (
        CheckConstraint("statut IN ('ACTIF','INACTIF','CONGÉ','SUSPENDU')", name="ck_employes_statut"),
        CheckConstraint(
            "departement IN ('DIRECTION','COMMERCIAL','OPERATIONS','FINANCE','RH','INFORMATIQUE','LOGISTIQUE','DIVERS')",
            name="ck_employes_departement",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    matricule: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)
    nom: Mapped[str] = mapped_column(String(255), index=True)
    prenom: Mapped[str | None] = mapped_column(String(255), nullable=True)
    poste: Mapped[str | None] = mapped_column(String(150), nullable=True)
    departement: Mapped[str] = mapped_column(String(50), default="DIVERS")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_embauche: Mapped[date | None] = mapped_column(Date, nullable=True)
    salaire_base_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    statut: Mapped[str] = mapped_column(String(20), default="ACTIF")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class PerformanceRH(Base):
    __tablename__ = "performances_rh"

    id: Mapped[int] = mapped_column(primary_key=True)
    employe_id: Mapped[int] = mapped_column(ForeignKey("employes.id", ondelete="CASCADE"), index=True)
    annee: Mapped[int] = mapped_column(Integer, index=True)

    nb_dossiers_traites: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ca_genere_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    objectif_ca_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    taux_realisation: Mapped[float | None] = mapped_column(Float, nullable=True)
    nb_clients_nouveaux: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nb_reclamations: Mapped[int | None] = mapped_column(Integer, nullable=True)
    prime_fcfa: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    evaluation: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1–5
    commentaires: Mapped[str | None] = mapped_column(Text, nullable=True)
