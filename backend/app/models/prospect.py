from datetime import date

from sqlalchemy import BigInteger, CheckConstraint, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Prospect(Base):
    __tablename__ = "prospects"
    __table_args__ = (
        CheckConstraint(
            "priorite IN ('P1','P2','P3')",
            name="ck_prospects_priorite",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"), unique=True, index=True
    )

    type_statut: Mapped[str | None] = mapped_column(String(30), nullable=True)
    priorite: Mapped[str] = mapped_column(String(5), default="P3")

    ca_pic_fcfa: Mapped[int] = mapped_column(BigInteger, default=0)
    ca_derniere_fcfa: Mapped[int] = mapped_column(BigInteger, default=0)
    annee_derniere_op: Mapped[int | None] = mapped_column(Integer, nullable=True)

    action_prevue: Mapped[str | None] = mapped_column(Text, nullable=True)
    date_relance: Mapped[date | None] = mapped_column(Date, nullable=True)
    statut_relance: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
