# =================================================================
# taal.ps1 -- Commandes TAAL SA Dashboard pour Windows (PowerShell)
# Usage : .\taal.ps1 <commande> [-nom "desc"] [-file "chemin"]
#
# Prerequis : Docker Desktop, PowerShell 5.1+
# Si bloque par l'execution policy :
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# =================================================================

param(
    [Parameter(Position = 0)]
    [string]$Command = "help",

    [string]$nom  = "",
    [string]$file = ""
)

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$ENV_FILE = ".env"

# -- Couleurs ------------------------------------------------------

function Write-Green($msg)  { Write-Host $msg -ForegroundColor Green  }
function Write-Yellow($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Red($msg)    { Write-Host $msg -ForegroundColor Red    }

# -- Lecture du .env -----------------------------------------------

function Get-EnvVar([string]$key) {
    if (Test-Path $ENV_FILE) {
        $line = Get-Content $ENV_FILE |
                Where-Object { $_ -match "^$key\s*=" } |
                Select-Object -First 1
        if ($line) { return ($line -replace "^$key\s*=\s*", "").Trim() }
    }
    return ""
}

function Get-DB {
    $u = Get-EnvVar "POSTGRES_USER"; if (-not $u) { $u = "taal_user" }
    $d = Get-EnvVar "POSTGRES_DB";   if (-not $d) { $d = "taal_db"   }
    return @{ User = $u; DB = $d }
}

# -- Ecriture SQL sans BOM (important pour PostgreSQL) -------------

function Write-SqlFile([string]$path, [string[]]$lines) {
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllLines(
        [System.IO.Path]::GetFullPath($path),
        $lines,
        $utf8NoBom
    )
}

# -- Verification Docker -------------------------------------------

function Assert-Docker {
    if (-not (Get-Command "docker" -ErrorAction SilentlyContinue)) {
        Write-Red "ERREUR : Docker n'est pas installe ou pas dans le PATH."
        Write-Host "  Telecharger : https://www.docker.com/products/docker-desktop"
        exit 1
    }
    $info = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Red "ERREUR : Docker Desktop n'est pas demarre. Lance-le et reessaie."
        exit 1
    }
}

# -- Attendre PostgreSQL -------------------------------------------

function Wait-Postgres([string]$dbUser) {
    Write-Yellow "-> Attente demarrage PostgreSQL..."
    for ($i = 0; $i -lt 30; $i++) {
        docker compose exec postgres pg_isready -U $dbUser 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep 2
    }
    Write-Red "ERREUR : PostgreSQL n'a pas demarre dans les delais."
    exit 1
}

# =================================================================
# Commandes
# =================================================================

switch ($Command) {

    # -- Aide ------------------------------------------------------
    "help" {
        Write-Host ""
        Write-Green  "  TAAL SA Dashboard -- Commandes Windows"
        Write-Host   "  Usage : .\taal.ps1 [commande] [options]"
        Write-Host ""
        Write-Yellow "  bootstrap                 " -NoNewline
        Write-Host   "Reset complet + demarrage avec seed.sql (apres git clone)"
        Write-Yellow "  dev                       " -NoNewline
        Write-Host   "Demarrer en developpement (hot-reload)"
        Write-Yellow "  dev-bg                    " -NoNewline
        Write-Host   "Demarrer en developpement (arriere-plan)"
        Write-Yellow "  prod                      " -NoNewline
        Write-Host   "Demarrer en production"
        Write-Yellow "  stop                      " -NoNewline
        Write-Host   "Arreter les conteneurs (sans supprimer)"
        Write-Yellow "  down                      " -NoNewline
        Write-Host   "Arreter et supprimer les conteneurs"
        Write-Yellow "  down-volumes              " -NoNewline
        Write-Host   "Supprimer conteneurs ET volumes (perd les donnees)"
        Write-Yellow "  ps                        " -NoNewline
        Write-Host   "Etat des conteneurs"
        Write-Yellow "  logs                      " -NoNewline
        Write-Host   "Logs de tous les services"
        Write-Yellow "  logs-backend              " -NoNewline
        Write-Host   "Logs backend uniquement"
        Write-Yellow "  logs-frontend             " -NoNewline
        Write-Host   "Logs frontend uniquement"
        Write-Host ""
        Write-Yellow "  snapshot                  " -NoNewline
        Write-Host   "Generer postgres/seed.sql depuis la DB courante"
        Write-Yellow "  seed                      " -NoNewline
        Write-Host   "Charger le fichier Excel initial"
        Write-Yellow "  migrate                   " -NoNewline
        Write-Host   "Appliquer les migrations Alembic"
        Write-Yellow "  migration-new -nom 'desc' " -NoNewline
        Write-Host   "Creer une nouvelle migration"
        Write-Yellow "  export-db                 " -NoNewline
        Write-Host   "Backup PostgreSQL -> backups\"
        Write-Yellow "  import-db -file [chemin]  " -NoNewline
        Write-Host   "Restaurer un backup SQL"
        Write-Host ""
        Write-Yellow "  shell-backend             " -NoNewline
        Write-Host   "Shell dans le conteneur Python"
        Write-Yellow "  shell-db                  " -NoNewline
        Write-Host   "Shell psql PostgreSQL"
        Write-Yellow "  shell-redis               " -NoNewline
        Write-Host   "Shell redis-cli"
        Write-Yellow "  pgadmin                   " -NoNewline
        Write-Host   "Demarrer PgAdmin sur :5050"
        Write-Yellow "  ssl-local                 " -NoNewline
        Write-Host   "Generer un certificat auto-signe (dev)"
        Write-Yellow "  test-backend              " -NoNewline
        Write-Host   "Lancer les tests pytest"
        Write-Yellow "  build                     " -NoNewline
        Write-Host   "Construire toutes les images (sans demarrer)"
        Write-Yellow "  setup                     " -NoNewline
        Write-Host   "Creer .env depuis .env.example"
        Write-Host ""
    }

    # -- Setup ----------------------------------------------------
    "setup" {
        if (-not (Test-Path $ENV_FILE)) {
            Copy-Item ".env.example" $ENV_FILE
            Write-Green "OK : .env cree depuis .env.example"
            Write-Yellow "-> Modifie .env avec tes vrais mots de passe avant de continuer"
        } else {
            Write-Yellow ".env existe deja"
        }
    }

    # -- Bootstrap (apres git clone) ------------------------------
    "bootstrap" {
        Assert-Docker
        Write-Yellow "ATTENTION : Suppression des volumes existants et rechargement depuis seed.sql"
        docker compose down -v --remove-orphans

        if (-not (Test-Path $ENV_FILE)) {
            Copy-Item ".env.example" $ENV_FILE
            Write-Green "OK : .env cree depuis .env.example"
        }

        docker compose up -d postgres redis
        $db = Get-DB
        Wait-Postgres $db.User

        Write-Green "OK : PostgreSQL pret -- seed.sql charge automatiquement"
        docker compose up --build -d

        Write-Host ""
        Write-Green "OK : Application demarree avec les donnees du snapshot"
        $fp = Get-EnvVar "FRONTEND_PORT"; if (-not $fp) { $fp = "3000" }
        $bp = Get-EnvVar "BACKEND_PORT";  if (-not $bp) { $bp = "8000" }
        Write-Host "  Frontend : http://localhost:$fp"
        Write-Host "  Backend  : http://localhost:$bp/docs"
    }

    # -- Developpement --------------------------------------------
    "dev" {
        Assert-Docker
        docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file $ENV_FILE up --build
    }

    "dev-bg" {
        Assert-Docker
        docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file $ENV_FILE up --build -d
        Write-Green "OK : Demarre en arriere-plan"
    }

    # -- Production -----------------------------------------------
    "prod" {
        Assert-Docker
        docker compose --env-file $ENV_FILE up --build -d
        Write-Green "OK : Application demarree"
        $fp = Get-EnvVar "FRONTEND_PORT"; if (-not $fp) { $fp = "3000" }
        $bp = Get-EnvVar "BACKEND_PORT";  if (-not $bp) { $bp = "8000" }
        Write-Host "  Frontend : http://localhost:$fp"
        Write-Host "  Backend  : http://localhost:$bp/docs"
    }

    # -- Controle -------------------------------------------------
    "stop"         { docker compose stop }
    "down"         { docker compose down }
    "down-volumes" {
        Write-Yellow "ATTENTION : Cela supprime toutes les donnees PostgreSQL et Redis !"
        $confirm = Read-Host "Confirmer ? [y/N]"
        if ($confirm -ieq "y") { docker compose down -v }
        else { Write-Yellow "Annule." }
    }
    "ps"           { docker compose ps }
    "logs"         { docker compose logs -f }
    "logs-backend" { docker compose logs -f backend }
    "logs-frontend"{ docker compose logs -f frontend }
    "logs-nginx"   { docker compose logs -f nginx }
    "build"        { docker compose --env-file $ENV_FILE build --no-cache }

    # -- Base de donnees ------------------------------------------
    "migrate"      { docker compose run --rm migrate }

    "migration-new" {
        if (-not $nom) {
            Write-Red "Usage : .\taal.ps1 migration-new -nom 'description'"
            exit 1
        }
        docker compose run --rm backend alembic revision --autogenerate -m "$nom"
    }

    "migration-history" { docker compose run --rm backend alembic history }
    "migrate-rollback"  { docker compose run --rm backend alembic downgrade -1 }

    # -- Seed -----------------------------------------------------
    "seed" {
        docker compose -f docker-compose.yml -f docker-compose.dev.yml `
            exec backend python -m app.seeds.seed_excel
        Write-Green "OK : Seed termine"
    }

    "seed-file" {
        if (-not $file) {
            Write-Red "Usage : .\taal.ps1 seed-file -file /app/data/seed/fichier.xlsx"
            exit 1
        }
        docker compose -f docker-compose.yml -f docker-compose.dev.yml `
            exec backend python -m app.seeds.seed_excel $file
        Write-Green "OK : Seed termine"
    }

    # -- Snapshot (genere postgres/seed.sql) ----------------------
    "snapshot" {
        Assert-Docker
        Write-Yellow "-> Export du snapshot vers postgres\seed.sql..."
        $db = Get-DB

        $lines = docker compose exec postgres pg_dump `
            -U $db.User -d $db.DB --no-owner --no-acl

        if ($LASTEXITCODE -ne 0) {
            Write-Red "ERREUR : pg_dump a echoue. Les services sont-ils demarres ?"
            exit 1
        }

        Write-SqlFile "postgres/seed.sql" $lines
        Write-Green "OK : postgres\seed.sql mis a jour"
        Write-Yellow "-> N'oublie pas : git add postgres/seed.sql && git commit"
    }

    # -- Export / Import backup -----------------------------------
    "export-db" {
        if (-not (Test-Path "backups")) { New-Item -ItemType Directory -Path "backups" | Out-Null }
        $db        = Get-DB
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $outFile   = "backups\taal_backup_$timestamp.sql"

        $lines = docker compose exec postgres pg_dump `
            -U $db.User -d $db.DB --no-owner --no-acl

        if ($LASTEXITCODE -ne 0) { Write-Red "ERREUR : pg_dump a echoue"; exit 1 }

        Write-SqlFile $outFile $lines
        Write-Green "OK : Backup sauvegarde : $outFile"
    }

    "import-db" {
        if (-not $file) {
            Write-Red "Usage : .\taal.ps1 import-db -file backups\monbackup.sql"
            exit 1
        }
        if (-not (Test-Path $file)) { Write-Red "ERREUR : Fichier introuvable : $file"; exit 1 }
        $db = Get-DB
        Get-Content $file | docker compose exec -T postgres psql -U $db.User -d $db.DB
        Write-Green "OK : Import termine"
    }

    # -- Shells ---------------------------------------------------
    "shell-backend" { docker compose exec backend bash }

    "shell-db" {
        $db = Get-DB
        docker compose exec postgres psql -U $db.User -d $db.DB
    }

    "shell-redis" {
        $rp = Get-EnvVar "REDIS_PASSWORD"
        docker compose exec redis redis-cli -a $rp
    }

    "shell-frontend" { docker compose exec frontend sh }

    # -- Outils ---------------------------------------------------
    "pgadmin" {
        docker compose --profile tools up -d pgadmin
        $pp = Get-EnvVar "PGADMIN_PORT"; if (-not $pp) { $pp = "5050" }
        Write-Green "OK : PgAdmin : http://localhost:$pp"
    }

    "ssl-local" {
        if (-not (Get-Command "openssl" -ErrorAction SilentlyContinue)) {
            Write-Red "ERREUR : openssl non trouve. Installe Git for Windows (inclut openssl)."
            exit 1
        }
        if (-not (Test-Path "nginx\certs")) { New-Item -ItemType Directory -Path "nginx\certs" | Out-Null }
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
            -keyout "nginx\certs\localhost.key" `
            -out    "nginx\certs\localhost.crt" `
            -subj   "/C=TG/ST=Maritime/L=Lome/O=TAAL SA/CN=localhost"
        Write-Green "OK : Certificats generes dans nginx\certs\"
    }

    # -- Tests ----------------------------------------------------
    "test-backend" {
        docker compose -f docker-compose.yml -f docker-compose.dev.yml `
            exec backend pytest app/tests/ -v
    }

    "test-backend-cov" {
        docker compose -f docker-compose.yml -f docker-compose.dev.yml `
            exec backend pytest app/tests/ --cov=app --cov-report=html
    }

    # -- Nettoyage ------------------------------------------------
    "clean" {
        docker system prune -f
        docker volume prune -f
    }

    "reset" {
        Write-Yellow "ATTENTION : Reset complet -- TOUTES les donnees seront perdues !"
        $confirm = Read-Host "Confirmer ? [y/N]"
        if ($confirm -ieq "y") {
            docker compose down -v
            docker system prune -f
            docker volume prune -f
            docker compose --env-file $ENV_FILE build --no-cache
            Write-Green "OK : Environnement reinitialise"
        } else {
            Write-Yellow "Annule."
        }
    }

    default {
        Write-Red "Commande inconnue : '$Command'"
        Write-Host "Lance .\taal.ps1 help pour voir toutes les commandes."
        exit 1
    }
}
