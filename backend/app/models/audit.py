from datetime import date

from sqlalchemy import CheckConstraint, Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditEntree(Base):
    __tablename__ = "audit_entrees"
    __table_args__ = (
        CheckConstraint(
            "type_audit IN ('INTERNE','EXTERNE','FISCAL','SOCIAL','OPERATIONNEL','INFORMATIQUE','QUALITE')",
            name="ck_audit_type",
        ),
        CheckConstraint(
            "statut IN ('PLANIFIÉ','EN COURS','TERMINÉ','SUIVI','CLOS')",
            name="ck_audit_statut",
        ),
        CheckConstraint(
            "priorite IN ('P1','P2','P3')",
            name="ck_audit_priorite",
        ),
        CheckConstraint(
            "conformite IN ('CONFORME','NON_CONFORME','PARTIEL','N/A')",
            name="ck_audit_conformite",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True, index=True)
    date_audit: Mapped[date] = mapped_column(Date, index=True)
    auditeur: Mapped[str | None] = mapped_column(String(255), nullable=True)
    type_audit: Mapped[str] = mapped_column(String(50), default="INTERNE")
    domaine: Mapped[str | None] = mapped_column(String(150), nullable=True)
    periode_debut: Mapped[date | None] = mapped_column(Date, nullable=True)
    periode_fin: Mapped[date | None] = mapped_column(Date, nullable=True)
    conformite: Mapped[str] = mapped_column(String(30), default="N/A")
    nb_observations: Mapped[int | None] = mapped_column(Integer, nullable=True)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommandations: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    statut: Mapped[str] = mapped_column(String(20), default="PLANIFIÉ")
    priorite: Mapped[str] = mapped_column(String(5), default="P3")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
