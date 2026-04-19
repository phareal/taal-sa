# ─────────────────────────────────────────────────────────────────
# Makefile — Commandes TAAL Dashboard
# Usage : make <cible>
# ─────────────────────────────────────────────────────────────────

.PHONY: help dev dev-backend prod stop down logs ps migrate shell-backend shell-db \
        build clean reset ssl-local pgadmin export-db import-db seed seed-file \
        snapshot bootstrap

COMPOSE      = docker compose
COMPOSE_DEV  = docker compose -f docker-compose.yml -f docker-compose.dev.yml
ENV_FILE     = .env

# Couleurs
GREEN  = \033[0;32m
YELLOW = \033[1;33m
NC     = \033[0m

help: ## Afficher cette aide
	@echo ""
	@echo "  $(GREEN)TAAL SA Dashboard — Commandes Docker$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ── Setup initial ─────────────────────────────────────────────────

setup: ## Première installation (copie .env, build images)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ .env créé depuis .env.example$(NC)"; \
		echo "$(YELLOW)→ Modifier .env avec vos vraies valeurs avant de continuer$(NC)"; \
	else \
		echo "$(YELLOW).env existe déjà$(NC)"; \
	fi

# ── Développement ─────────────────────────────────────────────────

dev: ## Démarrer en mode développement (hot-reload)
	$(COMPOSE_DEV) --env-file $(ENV_FILE) up --build

dev-bg: ## Démarrer en mode développement (background)
	$(COMPOSE_DEV) --env-file $(ENV_FILE) up --build -d

dev-backend: ## Démarrer uniquement postgres + redis + backend (utile avant que le frontend soit scaffolé)
	$(COMPOSE_DEV) --env-file $(ENV_FILE) up --build -d postgres redis backend

dev-logs: ## Logs en temps réel (mode dev)
	$(COMPOSE_DEV) logs -f backend frontend

# ── Production ────────────────────────────────────────────────────

prod: ## Démarrer en mode production
	$(COMPOSE) --env-file $(ENV_FILE) up --build -d
	@echo "$(GREEN)✓ Application démarrée$(NC)"
	@echo "  Frontend : http://localhost:$$(grep FRONTEND_PORT .env | cut -d= -f2)"
	@echo "  Backend  : http://localhost:$$(grep BACKEND_PORT .env | cut -d= -f2)"
	@echo "  API Docs : http://localhost:$$(grep BACKEND_PORT .env | cut -d= -f2)/docs"

build: ## Construire toutes les images sans démarrer
	$(COMPOSE) --env-file $(ENV_FILE) build --no-cache

# ── Contrôle ─────────────────────────────────────────────────────

stop: ## Arrêter les conteneurs (sans supprimer)
	$(COMPOSE) stop

down: ## Arrêter et supprimer les conteneurs
	$(COMPOSE) down

down-volumes: ## Arrêter et supprimer TOUT (conteneurs + volumes !)
	@echo "$(YELLOW)⚠ Cela supprime toutes les données PostgreSQL et Redis !$(NC)"
	@read -p "Confirmer ? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(COMPOSE) down -v

ps: ## État des conteneurs
	$(COMPOSE) ps

logs: ## Logs de tous les services
	$(COMPOSE) logs -f

logs-backend: ## Logs backend uniquement
	$(COMPOSE) logs -f backend

logs-frontend: ## Logs frontend uniquement
	$(COMPOSE) logs -f frontend

logs-nginx: ## Logs Nginx
	$(COMPOSE) logs -f nginx

# ── Base de données ───────────────────────────────────────────────

migrate: ## Appliquer les migrations Alembic
	$(COMPOSE) run --rm migrate

migrate-dev: ## Migrations en mode dev
	$(COMPOSE_DEV) run --rm migrate

migration-new: ## Créer une nouvelle migration (nom=<description>)
	$(COMPOSE) run --rm backend alembic revision --autogenerate -m "$(nom)"

migration-history: ## Historique des migrations
	$(COMPOSE) run --rm backend alembic history

migrate-rollback: ## Revenir à la migration précédente
	$(COMPOSE) run --rm backend alembic downgrade -1

# ── Seeding ───────────────────────────────────────────────────────

seed: ## Charger les données initiales depuis backend/data/seed/DASHBOARD-TAAL-SA.xlsx
	$(COMPOSE_DEV) exec backend python -m app.seeds.seed_excel
	@echo "$(GREEN)✓ Seed terminé$(NC)"

seed-file: ## Seed depuis un fichier Excel personnalisé (file=<chemin dans le conteneur>)
	$(COMPOSE_DEV) exec backend python -m app.seeds.seed_excel $(file)

export-db: ## Exporter la base de données (backup)
	@mkdir -p backups
	$(COMPOSE) exec postgres pg_dump \
		-U $$(grep POSTGRES_USER .env | cut -d= -f2) \
		-d $$(grep POSTGRES_DB .env | cut -d= -f2) \
		--no-owner --no-acl \
		> backups/taal_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Backup sauvegardé dans backups/$(NC)"

import-db: ## Importer un backup SQL (file=<chemin.sql>)
	$(COMPOSE) exec -T postgres psql \
		-U $$(grep POSTGRES_USER .env | cut -d= -f2) \
		-d $$(grep POSTGRES_DB .env | cut -d= -f2) \
		< $(file)

snapshot: ## Générer postgres/seed.sql depuis la DB courante (à committer dans git)
	@echo "$(YELLOW)→ Export du snapshot vers postgres/seed.sql…$(NC)"
	@$(COMPOSE) exec postgres pg_dump \
		-U $$(grep POSTGRES_USER .env | cut -d= -f2) \
		-d $$(grep POSTGRES_DB .env | cut -d= -f2) \
		--no-owner --no-acl \
		> postgres/seed.sql
	@echo "$(GREEN)✓ postgres/seed.sql mis à jour$(NC)"
	@echo "$(YELLOW)→ N'oublie pas : git add postgres/seed.sql && git commit$(NC)"

bootstrap: ## Repartir de zéro avec les données du snapshot (après git clone)
	@echo "$(YELLOW)⚠ Suppression des volumes existants et rechargement depuis seed.sql$(NC)"
	$(COMPOSE) down -v --remove-orphans
	@if [ ! -f .env ]; then cp .env.example .env; echo "$(GREEN)✓ .env créé$(NC)"; fi
	$(COMPOSE) up -d postgres redis
	@echo "$(YELLOW)→ Attente démarrage PostgreSQL…$(NC)"
	@until $(COMPOSE) exec postgres pg_isready -U $$(grep POSTGRES_USER .env | cut -d= -f2) -q; do sleep 1; done
	@echo "$(GREEN)✓ PostgreSQL prêt — le seed.sql est déjà chargé automatiquement$(NC)"
	$(COMPOSE) up --build -d
	@echo ""
	@echo "$(GREEN)✓ Application démarrée avec les données du snapshot$(NC)"
	@echo "  Frontend : http://localhost:$$(grep FRONTEND_PORT .env | cut -d= -f2)"
	@echo "  Backend  : http://localhost:$$(grep BACKEND_PORT .env | cut -d= -f2)/docs"

# ── Shells ────────────────────────────────────────────────────────

shell-backend: ## Shell dans le conteneur backend
	$(COMPOSE) exec backend bash

shell-db: ## Shell psql PostgreSQL
	$(COMPOSE) exec postgres psql \
		-U $$(grep POSTGRES_USER .env | cut -d= -f2) \
		-d $$(grep POSTGRES_DB .env | cut -d= -f2)

shell-redis: ## Shell redis-cli
	$(COMPOSE) exec redis redis-cli \
		-a $$(grep REDIS_PASSWORD .env | cut -d= -f2)

shell-frontend: ## Shell dans le conteneur frontend
	$(COMPOSE) exec frontend sh

# ── Outils optionnels ─────────────────────────────────────────────

pgadmin: ## Démarrer PgAdmin (interface web PostgreSQL)
	$(COMPOSE) --profile tools up -d pgadmin
	@echo "$(GREEN)✓ PgAdmin : http://localhost:$$(grep PGADMIN_PORT .env | cut -d= -f2)$(NC)"

# ── SSL local (dev sans Nginx) ────────────────────────────────────

ssl-local: ## Générer un certificat auto-signé local (pour Nginx en dev)
	@mkdir -p nginx/certs
	openssl req -x509 -nodes -days 365 \
		-newkey rsa:2048 \
		-keyout nginx/certs/localhost.key \
		-out nginx/certs/localhost.crt \
		-subj "/C=TG/ST=Maritime/L=Lome/O=TAAL SA/CN=localhost"
	@echo "$(GREEN)✓ Certificats générés dans nginx/certs/$(NC)"

# ── Nettoyage ─────────────────────────────────────────────────────

clean: ## Supprimer images, conteneurs stoppés et volumes orphelins
	docker system prune -f
	docker volume prune -f

reset: down-volumes clean build ## Reset complet (DANGER : perd toutes les données)
	@echo "$(GREEN)✓ Environnement réinitialisé$(NC)"

# ── Tests ─────────────────────────────────────────────────────────

test-backend: ## Lancer les tests backend
	$(COMPOSE_DEV) exec backend pytest app/tests/ -v

test-backend-cov: ## Tests backend avec couverture
	$(COMPOSE_DEV) exec backend pytest app/tests/ --cov=app --cov-report=html
