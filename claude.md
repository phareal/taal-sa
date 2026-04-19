# TAAL SA — Dashboard Groupage Maritime

Application BI full-stack pour TAAL SA (Lomé, Togo) : visualisation et saisie des
données de groupage LCL maritime (service NAT1, 2019–2026).

---

## Stack & Architecture

| Couche | Technologie |
|---|---|
| Backend | Python 3.11 · FastAPI · SQLAlchemy 2.0 async · Alembic |
| Frontend | Nuxt.js 3 · Vue 3 Composition API · TypeScript strict |
| Base de données | PostgreSQL 15 · asyncpg (driver async) · psycopg2 (Alembic) |
| Cache | Redis 7 · cache 5 min sur tous les endpoints `/analytics` |
| Excel | pandas + openpyxl (import) · xlsxwriter (export) |
| Infra | Docker Compose · Nginx reverse proxy · multi-stage Dockerfiles |
| State (front) | Pinia · VeeValidate + Zod · TanStack Table v8 · ApexCharts |

```
taal-dashboard/
├── backend/app/
│   ├── main.py            # FastAPI app, CORS, routers
│   ├── core/              # config (pydantic-settings), database, security
│   ├── models/            # SQLAlchemy ORM (6 tables)
│   ├── schemas/           # Pydantic v2 I/O
│   ├── routers/           # navires · shippers · clients · connaissements
│   │                      # cotations · prospects · analytics · import_export
│   ├── services/          # analytics_service · excel_service
│   └── migrations/        # Alembic
└── frontend/
    ├── pages/             # index · connaissements · clients · shippers
    │                      # cotations · prospects · import
    ├── components/        # ui/ · charts/ · forms/ · tables/
    ├── composables/       # useApi · useFilters · useCharts
    └── stores/            # dashboard · connaissements · ui (Pinia)
```

---

## Modèle de données (6 tables)

```sql
navires       (id, nom, compagnie, code_ligne, actif)
shippers      (id, nom, pays, statut CHECK('ACTIF','EN_DÉCLIN','PERDU'),
               ca_passe_fcfa, ca_actuel_fcfa, nb_bl_passe, nb_bl_actuel)
clients       (id, nom, secteur, pays, email, telephone)

connaissements  -- TABLE CENTRALE
  (id, numero_bl, navire_id FK, shipper_id FK, client_id FK,
   annee, mois, mois_num, quantite, poids_kg, volume_m3,
   docs_fees_fcfa, montant_normal_fcfa, marge_fcfa, taux_marge,
   type_operation CHECK('IMPORT','EXPORT'), notes, created_at, updated_at)

cotations     (id, numero_cotation UNIQUE, date_cotation, client_id FK,
               type_service, offre_transitaire, cotation_client, marge, devise,
               resultat CHECK('GAGNÉ','PERDU','EN COURS','ANNULÉ'),
               observations, agent_commercial)

prospects     (id, client_id FK UNIQUE, type_statut, priorite CHECK('P1','P2','P3'),
               ca_pic_fcfa, ca_derniere_fcfa, annee_derniere_op,
               action_prevue, date_relance, statut_relance, notes)
```

---

## Commandes projet

```bash
# Docker
make dev                        # démarrer avec hot-reload (backend :8000, frontend :3000)
make prod                       # production complète avec Nginx
make migrate                    # appliquer migrations Alembic
make migration-new nom="desc"   # créer une migration
make shell-db                   # psql interactif
make export-db                  # backup PostgreSQL → backups/

# Backend (dans le conteneur)
uvicorn app.main:app --reload   # dev
alembic upgrade head            # migrations
pytest app/tests/ -v            # tests

# Frontend (dans le conteneur)
npm run dev                     # dev HMR
npm run build                   # build production
npm run typecheck               # vérification TS
```

---

## Conventions de code

### Backend Python
- **Séparation stricte** : routes → appel service → retour schéma Pydantic
- **Jamais de SQL brut** : toujours SQLAlchemy ORM
- **Transactions** : `async with db.begin()` pour toute écriture multiple
- **Cache Redis** : décorateur `@cache(ttl=300)` sur tous les endpoints analytics
- **Pagination obligatoire** sur toutes les listes : `{ items, total, page, page_size, pages }`
- **Format d'erreur uniforme** : `{ detail: str, code: str, field?: str }`
- **Logging** : `structlog` en JSON, jamais `print()`
- Nommage : `snake_case` partout, modèles SQLAlchemy au singulier (`Connaissement`)

### Frontend TypeScript / Nuxt
- **TypeScript strict** : typer toutes les réponses API avec des interfaces dédiées
- **Composable `useApi`** : tous les appels HTTP passent par lui (gestion erreur + toast auto)
- **Filtres dans l'URL** : `useRoute/useRouter` pour persister les query params
- **Optimistic UI** : afficher immédiatement, rollback si erreur API
- **Formatage monétaire** : `Intl.NumberFormat('fr-TG', { style: 'currency', currency: 'XOF' })`
- **Zod** pour valider tous les formulaires avant envoi
- Nommage : composants `PascalCase`, composables `useXxx`, stores `useXxxStore`

---

## API — Endpoints principaux

```
# Analytics (GET, tous cachés Redis 5 min)
/api/analytics/kpis              ?annee&mois
/api/analytics/ca-mensuel        ?annees[]=2019&annees[]=2024
/api/analytics/ca-par-client     ?annee&limit=20
/api/analytics/ca-par-navire     ?annee
/api/analytics/evolution-client/{id}
/api/analytics/shippers-risque
/api/analytics/cotations-pipeline

# CRUD standard (GET list · POST · GET {id} · PUT {id} · DELETE {id})
/api/connaissements   /api/clients   /api/shippers
/api/navires          /api/cotations /api/prospects

# Import / Export Excel
POST /api/import/excel            multipart/form-data — upsert sur numero_bl
GET  /api/export/excel            ?annee&mois&format=xlsx|csv

# Santé
GET  /health
```

---

## Règles métier importantes

- **Shipper** = expéditeur (envoie la marchandise)
- **Client / Consignataire** = destinataire (reçoit la marchandise) — entités séparées
- `marge_fcfa` = `docs_fees_fcfa` - `montant_normal_fcfa` (disponible seulement 2026)
- `taux_marge` = `marge_fcfa / docs_fees_fcfa`
- Import Excel : détecter automatiquement la feuille par son nom,
  mapper les colonnes par nom (tolérant casse/espaces),
  upsert sur `numero_bl` (conflit → UPDATE, sinon INSERT),
  retourner `{ inserted, updated, errors: [{row, reason}] }`
- Numérotation cotations : format `COT-XXX` auto-incrémenté
- Statut shipper recalculé automatiquement à chaque import

---

## Variables d'environnement clés

```bash
# Backend (.env)
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/taal_db
DATABASE_SYNC_URL=postgresql://user:pass@postgres:5432/taal_db  # Alembic
REDIS_URL=redis://:pass@redis:6379/0
SECRET_KEY=...   # openssl rand -hex 32
ENVIRONMENT=development|production
CORS_ORIGINS=http://localhost:3000

# Frontend (nuxt.config.ts / .env)
NUXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## Charte graphique

```
--color-primary    : #0F4C81   (bleu marine)
--color-secondary  : #1D9E75   (teal — croissance)
--color-danger     : #E24B4A   (rouge — pertes/alertes)
--color-warning    : #EF9F27   (ambre — déclin)
--color-success    : #639922   (vert — objectifs)

Fonts : DM Sans (titres) · Inter (corps) · DM Mono (KPIs/montants)
Badges statut shipper : vert ACTIF · orange EN DÉCLIN · rouge PERDU
Badges cotation : vert GAGNÉ · rouge PERDU · bleu EN COURS · gris ANNULÉ
```

---

## Référence aux docs contextuelles

@docs/api-schema.md          — schémas Pydantic complets (si créé)
@docs/excel-mapping.md       — mapping colonnes Excel → base de données
@docker-compose.yml          — configuration des services Docker
@backend/requirements.txt    — dépendances Python exactes
