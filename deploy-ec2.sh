#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# deploy-ec2.sh — Déploiement TAAL Dashboard sur AWS EC2 (Ubuntu)
#
# Usage :
#   ./deploy-ec2.sh <EC2_IP> <KEY_PATH> [EC2_USER]
#
# Exemple :
#   ./deploy-ec2.sh 54.123.45.67 ~/.ssh/taal-key.pem ubuntu
#
# Prérequis locaux : ssh, rsync, openssl
# Prérequis EC2    : Ubuntu 22.04, ports 22 + 80 + 8000 ouverts (Security Group)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Arguments ─────────────────────────────────────────────────────
EC2_IP="${1:-}"
KEY_PATH="${2:-}"
EC2_USER="${3:-ubuntu}"
REMOTE_DIR="/home/${EC2_USER}/taal-dashboard"

# ── Couleurs ──────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}→${NC} $*"; }
error()   { echo -e "${RED}✗${NC} $*" >&2; exit 1; }
section() { echo -e "\n${CYAN}── $* ──${NC}"; }

# ── Validation ────────────────────────────────────────────────────
[[ -z "$EC2_IP"   ]] && error "Usage : $0 <EC2_IP> <KEY_PATH> [EC2_USER]"
[[ -z "$KEY_PATH" ]] && error "Usage : $0 <EC2_IP> <KEY_PATH> [EC2_USER]"
[[ ! -f "$KEY_PATH" ]] && error "Clé SSH introuvable : $KEY_PATH"

command -v ssh    >/dev/null || error "ssh non trouvé"
command -v rsync  >/dev/null || error "rsync non trouvé"
command -v openssl>/dev/null || error "openssl non trouvé"

chmod 400 "$KEY_PATH"

SSH_OPTS="-i ${KEY_PATH} -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o BatchMode=yes"
SSH_CMD="ssh ${SSH_OPTS} ${EC2_USER}@${EC2_IP}"

# ── Test connexion ────────────────────────────────────────────────
section "Vérification connexion EC2"
$SSH_CMD "echo ok" >/dev/null 2>&1 || error "Impossible de se connecter à ${EC2_USER}@${EC2_IP}. Vérifie l'IP et la clé SSH."
info "Connexion SSH OK → ${EC2_USER}@${EC2_IP}"

# ── Génération .env si absent ─────────────────────────────────────
section "Configuration .env"
if [[ ! -f .env ]]; then
    warn ".env absent — génération depuis .env.example avec mots de passe sécurisés"
    cp .env.example .env

    PG_PASS=$(openssl rand -hex 16)
    REDIS_PASS=$(openssl rand -hex 16)
    SECRET_KEY=$(openssl rand -hex 32)

    # Remplace les placeholders dans .env
    sed -i.bak \
        -e "s|CHANGE_ME_strong_password_here|${PG_PASS}|g" \
        -e "s|CHANGE_ME_redis_password|${REDIS_PASS}|g" \
        -e "s|CHANGE_ME_run_openssl_rand_hex_32|${SECRET_KEY}|g" \
        -e "s|DOMAIN=dashboard.taal.tg|DOMAIN=${EC2_IP}|g" \
        -e "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://${EC2_IP},http://${EC2_IP}:8000|g" \
        -e "s|NUXT_PUBLIC_API_BASE=.*|NUXT_PUBLIC_API_BASE=http://${EC2_IP}|g" \
        .env
    rm -f .env.bak
    info ".env généré avec mots de passe aléatoires"
else
    warn ".env existant conservé — mise à jour de DOMAIN et CORS_ORIGINS pour EC2"
    sed -i.bak \
        -e "s|^DOMAIN=.*|DOMAIN=${EC2_IP}|g" \
        -e "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://${EC2_IP},http://${EC2_IP}:8000|g" \
        -e "s|^NUXT_PUBLIC_API_BASE=.*|NUXT_PUBLIC_API_BASE=http://${EC2_IP}|g" \
        .env
    rm -f .env.bak
fi
info ".env configuré pour EC2 (${EC2_IP})"

# ── Installation Docker sur EC2 ───────────────────────────────────
section "Installation Docker sur EC2"
$SSH_CMD bash <<'REMOTE'
set -e
if ! command -v docker &>/dev/null; then
    echo "→ Installation Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "✓ Docker installé"
else
    echo "✓ Docker déjà installé : $(docker --version)"
fi

# Plugin Compose v2
if ! docker compose version &>/dev/null; then
    echo "→ Installation Docker Compose plugin..."
    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p "$DOCKER_CONFIG/cli-plugins"
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
        -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
    chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"
    echo "✓ Docker Compose installé"
else
    echo "✓ Docker Compose : $(docker compose version)"
fi
REMOTE
info "Docker prêt sur EC2"

# ── Transfert des fichiers ─────────────────────────────────────────
section "Transfert des fichiers vers EC2"
warn "Synchronisation du projet (rsync)…"

rsync -az --progress \
    --exclude='.git' \
    --exclude='.env.bak' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.pytest_cache' \
    --exclude='backups' \
    --exclude='frontend/.nuxt' \
    --exclude='frontend/.output' \
    --exclude='frontend/node_modules' \
    -e "ssh ${SSH_OPTS}" \
    ./ "${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/"

info "Fichiers transférés → ${REMOTE_DIR}"

# ── Démarrage de l'application ────────────────────────────────────
section "Démarrage de l'application"
$SSH_CMD bash <<REMOTE
set -e
cd "${REMOTE_DIR}"

# Groupe docker actif sans re-login (si installation fraîche)
if ! groups | grep -q docker; then
    exec sg docker "\$0" "\$@"
fi

echo "→ Build et démarrage des conteneurs (peut prendre 3-5 min)…"
docker compose -f docker-compose.yml -f docker-compose.ec2.yml --env-file .env up --build -d

echo "→ Attente que le backend soit prêt…"
for i in \$(seq 1 24); do
    if docker compose exec -T backend curl -sf http://localhost:8000/health >/dev/null 2>&1; then
        echo "✓ Backend opérationnel"
        break
    fi
    [ \$i -eq 24 ] && echo "⚠ Backend lent à démarrer — vérifie : docker compose logs backend"
    sleep 5
done

docker compose ps
REMOTE

# ── Résumé ────────────────────────────────────────────────────────
section "Déploiement terminé"
echo ""
echo -e "  ${GREEN}Frontend   :${NC} http://${EC2_IP}"
echo -e "  ${GREEN}API Docs   :${NC} http://${EC2_IP}/docs"
echo -e "  ${GREEN}API Direct :${NC} http://${EC2_IP}:8000/docs"
echo ""
echo -e "  ${YELLOW}Logs       :${NC} ssh -i ${KEY_PATH} ${EC2_USER}@${EC2_IP} 'cd ${REMOTE_DIR} && docker compose logs -f'"
echo -e "  ${YELLOW}Shell DB   :${NC} ssh -i ${KEY_PATH} ${EC2_USER}@${EC2_IP} 'cd ${REMOTE_DIR} && docker compose exec postgres psql -U taal_user -d taal_db'"
echo ""
echo -e "  ${CYAN}Security Group AWS requis :${NC} TCP 22 (SSH) · 80 (HTTP) · 8000 (API direct)"
echo ""
