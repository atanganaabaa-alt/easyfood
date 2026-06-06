-- ============================================================
-- EasyFood - Migration Sprint 3 (livraison + évaluations)
-- À appliquer sur une base déjà initialisée, sans perdre les données :
--   psql -U postgres -d easyfood -f migration_sprint3.sql
-- ============================================================

-- 1) Note et compteur de courses pour les livreurs.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS note NUMERIC(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_courses INTEGER NOT NULL DEFAULT 0;

-- 2) Coordonnées GPS + compteur d'avis pour les restaurants.
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS nb_evaluations INTEGER NOT NULL DEFAULT 0;

-- 3) Livreur affecté + nouveau statut "en_livraison" sur les commandes.
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS livreur_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE commandes DROP CONSTRAINT IF EXISTS commandes_statut_check;
ALTER TABLE commandes ADD CONSTRAINT commandes_statut_check
  CHECK (statut IN ('en_attente', 'acceptee', 'en_preparation', 'prete', 'en_livraison', 'livree', 'annulee'));

CREATE INDEX IF NOT EXISTS idx_commandes_livreur ON commandes(livreur_id);

-- 4) Table des évaluations.
CREATE TABLE IF NOT EXISTS evaluations (
  id              SERIAL PRIMARY KEY,
  commande_id     INTEGER UNIQUE NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  client_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id   INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  livreur_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note_restaurant INTEGER NOT NULL CHECK (note_restaurant BETWEEN 1 AND 5),
  note_livreur    INTEGER CHECK (note_livreur BETWEEN 1 AND 5),
  commentaire     TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_restaurant ON evaluations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_livreur ON evaluations(livreur_id);

-- 5) Coordonnées GPS des restaurants de démo (Douala / Yaoundé).
UPDATE restaurants SET latitude = 4.051100, longitude = 9.767900 WHERE nom = 'Chez Mama Africa';
UPDATE restaurants SET latitude = 3.895100, longitude = 11.502100 WHERE nom = 'Le Grill du Soleil';
UPDATE restaurants SET latitude = 4.092800, longitude = 9.737600 WHERE nom = 'Le Goût d''Ici';
