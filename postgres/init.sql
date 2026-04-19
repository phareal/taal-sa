-- ─────────────────────────────────────────────────────────────────
-- postgres/init.sql — Script d'initialisation (lancé une seule fois)
-- Crée les extensions utiles avant qu'Alembic génère les tables
-- ─────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- recherche textuelle floue
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- recherche sans accents

-- Index de recherche textuelle (sera utilisé par les requêtes LIKE/ILIKE)
-- (Les tables elles-mêmes sont créées par Alembic)

-- Timezone par défaut
SET timezone = 'Africa/Lome';
