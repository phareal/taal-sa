from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    analytics, audit, clients, comptabilite, connaissements,
    conteneurs, cotations, employes, import_export, navires,
    prospects, shippers,
)
from app.routers.employes import perf_router

app = FastAPI(
    title="TAAL SA Dashboard API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(analytics.router)

# Opérationnel
app.include_router(connaissements.router)
app.include_router(conteneurs.router)
app.include_router(clients.router)
app.include_router(shippers.router)
app.include_router(navires.router)

# Commercial
app.include_router(cotations.router)
app.include_router(prospects.router)

# Support
app.include_router(employes.router)
app.include_router(perf_router)
app.include_router(comptabilite.router)
app.include_router(audit.router)

# Import / Export
app.include_router(import_export.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": "2.0.0", "env": settings.ENVIRONMENT}
