# TAAL SA Dashboard — Docker Setup

Application full-stack dockerisée : **FastAPI** (Python) + **Nuxt.js 3** + **PostgreSQL** + **Redis** + **Nginx**

---

## Prérequis

| Outil | Version minimum | Lien |
|---|---|---|
| Docker Desktop | 4.x (Engine 24+) | https://www.docker.com/products/docker-desktop |
| Git | 2.x | https://git-scm.com |
| Make *(Linux/Mac)* | — | inclus sur Linux/Mac |
| PowerShell *(Windows)* | 5.1+ | inclus dans Windows 10/11 |

---

## Démarrage rapide

### Linux / macOS

```bash
git clone git@github.com:phareal/taal-sa.git
cd taal-sa
make bootstrap      # build + start + données chargées automatiquement
```

### Windows (PowerShell)

```powershell
git clone git@github.com:phareal/taal-sa.git
cd taal-sa

# Autoriser les scripts PowerShell (une seule fois)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Démarrer avec les données
.\taal.ps1 bootstrap
```

Les services sont accessibles immédiatement :

| Service | URL |
|---|---|
| Frontend Nuxt.js | http://localhost:3000 |
| Backend FastAPI | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |

---

## Développement (hot-reload)

**Linux / macOS**
```bash
make dev
```

**Windows**
```powershell
.\taal.ps1 dev
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

| Action | Linux / macOS | Windows (PowerShell) |
|---|---|---|
| Aide | `make help` | `.\taal.ps1 help` |
| **Démarrer (données incluses)** | `make bootstrap` | `.\taal.ps1 bootstrap` |
| Dev hot-reload | `make dev` | `.\taal.ps1 dev` |
| Production | `make prod` | `.\taal.ps1 prod` |
| Arrêter | `make stop` | `.\taal.ps1 stop` |
| Supprimer conteneurs | `make down` | `.\taal.ps1 down` |
| État | `make ps` | `.\taal.ps1 ps` |
| Logs | `make logs` | `.\taal.ps1 logs` |
| **Snapshot données** | `make snapshot` | `.\taal.ps1 snapshot` |
| Seed Excel | `make seed` | `.\taal.ps1 seed` |
| Migrations | `make migrate` | `.\taal.ps1 migrate` |
| Nouvelle migration | `make migration-new nom="desc"` | `.\taal.ps1 migration-new -nom "desc"` |
| Backup DB | `make export-db` | `.\taal.ps1 export-db` |
| Restaurer backup | `make import-db file=path.sql` | `.\taal.ps1 import-db -file path.sql` |
| Shell Python | `make shell-backend` | `.\taal.ps1 shell-backend` |
| Shell psql | `make shell-db` | `.\taal.ps1 shell-db` |
| PgAdmin | `make pgadmin` | `.\taal.ps1 pgadmin` |
| Tests | `make test-backend` | `.\taal.ps1 test-backend` |

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

**Linux / macOS**
```bash
make dev-bg
make seed
make seed-file file=/app/data/seed/autre-fichier.xlsx
```

**Windows**
```powershell
.\taal.ps1 dev-bg
.\taal.ps1 seed
.\taal.ps1 seed-file -file /app/data/seed/autre-fichier.xlsx
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

**Linux / macOS**
```bash
make ssl-local
```
**Windows**
```powershell
.\taal.ps1 ssl-local   # nécessite openssl (inclus dans Git for Windows)
```

---

## Workflow snapshot — Versionner les données

```
┌──────────────────────────────────────────────────────────┐
│  Modifier des données  →  make snapshot / .\taal.ps1 snapshot  │
│  ↓                                                        │
│  git add postgres/seed.sql && git commit && git push      │
│  ↓                                                        │
│  Collègue : git pull && make bootstrap                    │
└──────────────────────────────────────────────────────────┘
```

**Linux / macOS**
```bash
make snapshot
git add postgres/seed.sql && git commit -m "chore: mise à jour snapshot" && git push
```
**Windows**
```powershell
.\taal.ps1 snapshot
git add postgres/seed.sql
git commit -m "chore: mise à jour snapshot"
git push
```

---

## Sauvegarde automatique (cron)

Ajouter dans la crontab de l'hôte (Linux) :

```bash
# Backup quotidien à 2h du matin
0 2 * * * cd /chemin/taal-sa && make export-db >> /var/log/taal-backup.log 2>&1

# Nettoyage des backups > 30 jours
0 3 * * 0 find /chemin/taal-sa/backups -mtime +30 -delete
```

Sous Windows, utiliser le **Planificateur de tâches** ou :
```powershell
# Backup manuel
.\taal.ps1 export-db
```

---

## Dépannage

### Le backend ne démarre pas
**Linux / macOS** : `make logs-backend`
**Windows** : `.\taal.ps1 logs-backend`
```
# Vérifier les variables DATABASE_URL et REDIS_URL dans .env
```

### Migrations échouées
**Linux / macOS**
```bash
make shell-backend
alembic history
alembic upgrade head
```
**Windows**
```powershell
.\taal.ps1 shell-backend
# dans le conteneur :
alembic history
alembic upgrade head
```

### PowerShell bloqué sur Windows
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Réinitialisation complète (⚠️ perd les données)
**Linux / macOS** : `make reset`
**Windows** : `.\taal.ps1 reset`
