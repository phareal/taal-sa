# TAAL SA Dashboard — Docker Setup

Application full-stack dockerisée : **FastAPI** (Python) + **Nuxt.js 3** + **PostgreSQL** + **Redis** + **Nginx**

---

## Prérequis

| Outil | Version minimum |
|---|---|
| Docker | 24+ |
| Docker Compose | v2.20+ |
| Make | (optionnel mais recommandé) |

---

## Démarrage rapide

### Option A — Démarrage avec les données incluses (recommandé)

Le dépôt contient un snapshot SQL complet (`postgres/seed.sql`).
PostgreSQL le charge **automatiquement** au premier démarrage.

```bash
git clone <repo>
cd taal-docker
make bootstrap      # ← une seule commande : build + start + données chargées
```

Les services seront accessibles immédiatement avec toutes les données :

| Service | URL |
|---|---|
| Frontend Nuxt.js | http://localhost:3000 |
| Backend FastAPI | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |

---

### Option B — Démarrage manuel (développement)

```bash
git clone <repo>
cd taal-docker

# Copier et éditer les variables d'environnement
cp .env.example .env
nano .env   # → modifier les mots de passe si besoin

make dev    # hot-reload, les données sont chargées depuis seed.sql
```

Les services sont accessibles sur :

| Service | URL |
|---|---|
| Frontend Nuxt.js | http://localhost:3000 |
| Backend FastAPI | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 3. Lancer en production

```bash
make prod
```

---

## Architecture des services

```
┌─────────────────────────────────────────────────┐
│  Navigateur                                     │
└──────────────────┬──────────────────────────────┘
                   │ :80 / :443
         ┌─────────▼─────────┐
         │      Nginx         │  reverse proxy + TLS
         └──┬────────────┬───┘
            │            │
   /api/*   │            │  /*
    ┌───────▼──┐    ┌────▼──────┐
    │ FastAPI  │    │  Nuxt.js  │
    │ :8000    │    │  :3000    │
    └───┬──────┘    └───────────┘
        │
   ┌────┴────┐    ┌─────────┐
   │ Postgres│    │  Redis  │
   │  :5432  │    │  :6379  │
   └─────────┘    └─────────┘
```

---

## Commandes disponibles

```bash
make help              # Liste toutes les commandes

# ── Démarrage ──────────────────────────────────────────────────
make bootstrap         # Reset complet + démarrage avec seed.sql (après clone)
make dev               # Démarrer avec hot-reload
make prod              # Démarrer en production
make stop              # Arrêter sans supprimer
make down              # Arrêter et supprimer

# ── Snapshot des données ───────────────────────────────────────
make snapshot          # Générer postgres/seed.sql depuis la DB courante
                       # → puis git add postgres/seed.sql && git commit

# ── Base de données ────────────────────────────────────────────
make migrate           # Appliquer les migrations Alembic
make export-db         # Backup PostgreSQL → backups/
make import-db file=backups/monbackup.sql

# ── Seed initial (Excel) ───────────────────────────────────────
make seed              # Charger backend/data/seed/DASHBOARD-TAAL-SA.xlsx
make snapshot          # Puis générer seed.sql pour versionner les données

# ── Outils ─────────────────────────────────────────────────────
make shell-backend     # Shell dans le conteneur Python
make shell-db          # Shell psql
make pgadmin           # Démarrer PgAdmin sur :5050
make logs-nginx        # Logs Nginx
make test-backend      # Lancer les tests pytest
make migration-new nom="ajout_colonne_xyz"
```

---

## Structure des fichiers Docker

```
taal-dashboard/
├── docker-compose.yml          # Orchestration production
├── docker-compose.dev.yml      # Overrides développement
├── .env.example                # Template variables d'environnement
├── Makefile                    # Commandes raccourcis
│
├── backend/
│   ├── Dockerfile              # Multi-stage : dev → builder → prod
│   ├── requirements.txt
│   └── .dockerignore
│
├── frontend/
│   ├── Dockerfile              # Multi-stage : dev → builder → prod
│   └── .dockerignore
│
├── nginx/
│   ├── nginx.conf              # Config principale
│   └── conf.d/
│       └── taal.conf           # Virtual host + proxy rules
│
└── postgres/
    ├── init.sql                # Extensions PostgreSQL (uuid, pg_trgm) — 01_init
    └── seed.sql                # Snapshot schema + données — 02_seed (auto au 1er boot)
```

---

## Variables d'environnement importantes

| Variable | Description | Défaut |
|---|---|---|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | ⚠️ À changer |
| `REDIS_PASSWORD` | Mot de passe Redis | ⚠️ À changer |
| `SECRET_KEY` | Clé JWT FastAPI | ⚠️ `openssl rand -hex 32` |
| `DOMAIN` | Domaine public (Nginx/TLS) | `localhost` |
| `ENVIRONMENT` | `development` ou `production` | `production` |
| `BUILD_TARGET` | Stage Docker cible | `production` |

---

## Import du fichier Excel TAAL SA

### Option A — Seeding initial (en ligne de commande)

Le fichier `DASHBOARD-TAAL-SA.xlsx` placé dans `backend/data/seed/` est chargé par
un script qui purge les tables puis ré-insère tout (idempotent).

```bash
make dev-bg     # démarrer les services en arrière-plan
make seed       # charger le fichier par défaut

# Ou avec un fichier spécifique (chemin dans le conteneur)
make seed-file file=/app/data/seed/autre-fichier.xlsx
```

Ce que fait le seeder :
- crée les tables si elles n'existent pas (`Base.metadata.create_all`),
- purge `cotations, prospects, connaissements, clients, shippers, navires`,
- dérive navires / shippers / clients des feuilles de connaissements,
- insère les BLs 2019-2025 puis 2026 (avec marges),
- enrichit les shippers avec CA / statut depuis `🚚 SHIPPERS À RELANCER`,
- insère les prospects et cotations.

### Option B — Import via l'API (fichier utilisateur)

Une fois l'application démarrée :

1. Ouvrir http://localhost:3000/import
2. Glisser-déposer le fichier `DASHBAORD_TAAL-SA.xlsx`
3. Vérifier l'aperçu des 10 premières lignes
4. Cliquer **Importer** → le backend détecte automatiquement les feuilles

Ou via l'API directement :

```bash
curl -X POST http://localhost:8000/api/import/excel \
  -F "file=@DASHBAORD_TAAL-SA.xlsx"
```

---

## SSL / HTTPS en production

### Avec Let's Encrypt (domaine public)

```bash
# Installer certbot sur l'hôte
sudo apt install certbot

# Obtenir le certificat (Nginx doit écouter sur :80)
sudo certbot certonly --webroot \
  -w ./certbot-www \
  -d dashboard.taal.tg

# Les certificats sont montés automatiquement dans Nginx
```

### Certificat auto-signé (dev local)

```bash
make ssl-local
# → génère nginx/certs/localhost.crt et localhost.key
```

---

## Sauvegarde automatique (cron)

Ajouter dans la crontab de l'hôte :

```bash
# Backup quotidien à 2h du matin
0 2 * * * cd /chemin/taal-dashboard && make export-db >> /var/log/taal-backup.log 2>&1

# Nettoyage des backups > 30 jours
0 3 * * 0 find /chemin/taal-dashboard/backups -mtime +30 -delete
```

---

## Dépannage

### Le backend ne démarre pas
```bash
make logs-backend
# Vérifier les variables DATABASE_URL et REDIS_URL dans .env
```

### Migrations échouées
```bash
make shell-backend
alembic history     # voir l'état
alembic upgrade head
```

### Réinitialisation complète (⚠️ perd les données)
```bash
make reset
```
