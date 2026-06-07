-- ============================================================
-- EasyFood - Migration Sprint 4 (back-office admin + finition)
-- À appliquer sur une base déjà initialisée :
--   psql -U postgres -d easyfood -f migration_sprint4.sql
-- ============================================================

-- 1) Statut des comptes : actif (suspension) + validé (restaurateurs).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS actif  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS valide BOOLEAN NOT NULL DEFAULT TRUE;

-- 2) Catégorie de restaurant (pour le filtrage).
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS categorie VARCHAR(60);

-- 3) Commission prélevée sur chaque commande (en XAF).
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS commission INTEGER NOT NULL DEFAULT 0;

-- 4) Table de paramètres globaux (clé/valeur) : ex. taux de commission.
CREATE TABLE IF NOT EXISTS parametres (
  cle    VARCHAR(60) PRIMARY KEY,
  valeur VARCHAR(255) NOT NULL
);
-- Taux de commission par défaut : 10 %.
INSERT INTO parametres (cle, valeur) VALUES ('taux_commission', '0.10')
  ON CONFLICT (cle) DO NOTHING;

-- 5) Catégories des restaurants de démo.
UPDATE restaurants SET categorie = 'Cuisine camerounaise' WHERE nom = 'Chez Mama Africa';
UPDATE restaurants SET categorie = 'Grillades'            WHERE nom = 'Le Grill du Soleil';
UPDATE restaurants SET categorie = 'Cuisine camerounaise' WHERE nom = 'Le Goût d''Ici';
