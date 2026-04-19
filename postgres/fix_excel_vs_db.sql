-- ─────────────────────────────────────────────────────────────────────────────
--  Correctif des incohérences Excel ↔ Base
--  Source : DASHBOARD-TAAL-SA.xlsx
--  À exécuter dans une transaction. Vérifier les COUNT(*) avant COMMIT.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Doublons d'import (NULL + SYNTH-* identiques) ─────────────────────────
--    109 (2019) + 7 (2020) + 8 (2021) + 1 (2022) = 125 lignes à supprimer.
--    On garde la version SYNTH-* (clé exploitable pour upsert) et on supprime
--    la ligne jumelle dont numero_bl IS NULL.

WITH null_rows AS (
  SELECT id, annee, mois_num, navire_id, shipper_id, client_id, poids_kg, docs_fees_fcfa
  FROM connaissements
  WHERE numero_bl IS NULL
),
to_delete AS (
  SELECT n.id
  FROM null_rows n
  WHERE EXISTS (
    SELECT 1 FROM connaissements s
    WHERE s.numero_bl LIKE 'SYNTH-%'
      AND s.annee = n.annee
      AND COALESCE(s.mois_num, -1)        = COALESCE(n.mois_num, -1)
      AND COALESCE(s.navire_id, -1)       = COALESCE(n.navire_id, -1)
      AND COALESCE(s.shipper_id, -1)      = COALESCE(n.shipper_id, -1)
      AND COALESCE(s.client_id, -1)       = COALESCE(n.client_id, -1)
      AND COALESCE(s.poids_kg, -1)        = COALESCE(n.poids_kg, -1)
      AND COALESCE(s.docs_fees_fcfa, -1)  = COALESCE(n.docs_fees_fcfa, -1)
  )
)
DELETE FROM connaissements WHERE id IN (SELECT id FROM to_delete);
-- Attendu : 125 lignes supprimées.


-- ── 2. Ligne de test "Etienne" (2026) ────────────────────────────────────────
DELETE FROM connaissements
WHERE numero_bl = 'Etienne'
  AND notes = 'asdasd';
-- Attendu : 1 ligne supprimée.


-- ── 3. Marges 2026 — réaligner sur Excel (overrides manuels) ────────────────
--    L'import a recalculé marge = docs_fees - montant_normal, écrasant
--    4 valeurs explicitement saisies dans Excel.
--    Le règlement métier (CLAUDE.md) dit que marge = docs - normal ; cependant,
--    Excel comporte des saisies manuelles divergentes. Choix au métier :
--
--    OPTION A — Conserver le calcul (laisser la base, c'est conforme à la règle).
--    OPTION B — Réaligner sur Excel : décommenter les UPDATE ci-dessous.

-- UPDATE connaissements SET marge_fcfa =  11000  WHERE annee=2026 AND numero_bl='MIL/LFW/08843';
-- UPDATE connaissements SET marge_fcfa = 132000  WHERE annee=2026 AND numero_bl='LEH/LFW/08846';
-- UPDATE connaissements SET marge_fcfa =  59000  WHERE annee=2026 AND numero_bl='NAV/LFW/00884';
-- UPDATE connaissements SET marge_fcfa =      0,
--                           montant_normal_fcfa = NULL  -- évite le recalcul
--   WHERE annee=2026 AND numero_bl='NAV/LFW/00890';


-- ── 4. Clients orphelins (11) — aucun B/L n'y fait référence ────────────────
--    Probables doublons orthographiques importés. À supprimer après revue.

-- Liste à inspecter d'abord :
--   SELECT id, nom FROM clients cl
--   WHERE NOT EXISTS (SELECT 1 FROM connaissements c WHERE c.client_id = cl.id);

-- DELETE FROM clients cl
-- WHERE NOT EXISTS (SELECT 1 FROM connaissements c WHERE c.client_id = cl.id);


-- ── Vérifications avant COMMIT ──────────────────────────────────────────────
SELECT 'connaissements'  AS tbl, COUNT(*) AS n, 2744 AS attendu_excel
FROM connaissements
UNION ALL
SELECT 'connaissements_2019', COUNT(*), 109 FROM connaissements WHERE annee=2019
UNION ALL
SELECT 'connaissements_2020', COUNT(*), 582 FROM connaissements WHERE annee=2020
UNION ALL
SELECT 'connaissements_2021', COUNT(*), 482 FROM connaissements WHERE annee=2021
UNION ALL
SELECT 'connaissements_2022', COUNT(*), 456 FROM connaissements WHERE annee=2022
UNION ALL
SELECT 'connaissements_2026', COUNT(*), 195 FROM connaissements WHERE annee=2026;

-- COMMIT;   -- décommenter une fois les chiffres vérifiés
ROLLBACK;
