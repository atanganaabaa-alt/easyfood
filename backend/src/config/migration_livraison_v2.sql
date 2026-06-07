-- ============================================================
-- EasyFood - Migration "livraison v2"
-- - Livreurs rattachés à un restaurateur (équipe de livraison)
-- - Position GPS du livreur par commande (suivi en temps réel)
-- À appliquer :
--   psql -U postgres -d easyfood -f migration_livraison_v2.sql
-- ============================================================

-- 1) Employeur d'un livreur : le restaurateur qui l'a recruté.
--    NULL = livreur non rattaché (ne voit aucune mission).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS employeur_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_employeur ON users(employeur_id);

-- 2) Position GPS du livreur pour une commande en cours de livraison.
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS livreur_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS livreur_lng NUMERIC(9,6);

-- 3) Démo : rattacher le livreur de démo au restaurateur de démo.
UPDATE users
SET employeur_id = (SELECT id FROM users WHERE email = 'resto@easyfood.cm')
WHERE email = 'livreur@easyfood.cm';
