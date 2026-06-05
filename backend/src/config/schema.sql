-- ============================================================
-- EasyFood - Schéma de la base de données PostgreSQL (Sprint 1)
-- ============================================================
-- Pour initialiser la base :
--   createdb easyfood            (ou via pgAdmin)
--   psql -U postgres -d easyfood -f schema.sql
-- ============================================================

-- On supprime les tables existantes pour pouvoir relancer le script proprement.
-- L'ordre tient compte des clés étrangères (les plats dépendent des restaurants).
DROP TABLE IF EXISTS plats CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------
-- Table des utilisateurs (clients, restaurateurs, livreurs, admin)
-- ------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  mot_de_passe  VARCHAR(255) NOT NULL,          -- toujours chiffré (bcrypt)
  telephone     VARCHAR(30),
  role          VARCHAR(20) NOT NULL DEFAULT 'client'
                CHECK (role IN ('client', 'restaurateur', 'livreur', 'admin')),
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Table des restaurants (appartiennent à un restaurateur)
-- ------------------------------------------------------------
CREATE TABLE restaurants (
  id              SERIAL PRIMARY KEY,
  nom             VARCHAR(150) NOT NULL,
  adresse         VARCHAR(255) NOT NULL,
  description     TEXT,
  logo_url        VARCHAR(500),
  horaires        VARCHAR(255),                 -- ex: "Lun-Dim : 09h - 22h"
  -- Champs utiles à la comparaison (trouver le meilleur restaurant) :
  note            NUMERIC(2,1) NOT NULL DEFAULT 0,    -- note moyenne sur 5 (ex: 4.8)
  delai_min       INTEGER NOT NULL DEFAULT 20,        -- délai de livraison minimum (minutes)
  delai_max       INTEGER NOT NULL DEFAULT 40,        -- délai de livraison maximum (minutes)
  frais_livraison INTEGER NOT NULL DEFAULT 0,         -- frais de livraison en XAF
  distance_km     NUMERIC(4,1) NOT NULL DEFAULT 0,    -- distance approximative en km
  proprietaire_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Table des plats (le "menu" d'un restaurant = l'ensemble de ses plats)
-- Les prix sont en XAF (francs CFA), donc des entiers (pas de centimes).
-- ------------------------------------------------------------
CREATE TABLE plats (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(150) NOT NULL,
  description   TEXT,
  prix          INTEGER NOT NULL CHECK (prix >= 0),   -- en XAF
  photo_url     VARCHAR(500),
  disponible    BOOLEAN NOT NULL DEFAULT TRUE,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour accélérer la recherche des plats d'un restaurant.
CREATE INDEX idx_plats_restaurant ON plats(restaurant_id);
CREATE INDEX idx_restaurants_proprietaire ON restaurants(proprietaire_id);
