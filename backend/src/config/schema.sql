-- ============================================================
-- EasyFood - Schéma de la base de données PostgreSQL (Sprint 1)
-- ============================================================
-- Pour initialiser la base :
--   createdb easyfood            (ou via pgAdmin)
--   psql -U postgres -d easyfood -f schema.sql
-- ============================================================

-- On supprime les tables existantes pour pouvoir relancer le script proprement.
-- L'ordre tient compte des clés étrangères (les enfants avant les parents).
DROP TABLE IF EXISTS commande_items CASCADE;
DROP TABLE IF EXISTS commandes CASCADE;
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

-- ------------------------------------------------------------
-- Table des commandes (Sprint 2)
-- Une commande = un client qui commande dans UN restaurant.
-- ------------------------------------------------------------
CREATE TABLE commandes (
  id                 SERIAL PRIMARY KEY,
  client_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id      INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  adresse_livraison  VARCHAR(255) NOT NULL,
  telephone          VARCHAR(30) NOT NULL,
  sous_total         INTEGER NOT NULL,                  -- somme des plats (XAF)
  frais_livraison    INTEGER NOT NULL DEFAULT 0,        -- frais de livraison (XAF)
  total              INTEGER NOT NULL,                  -- sous_total + frais_livraison
  mode_paiement      VARCHAR(20) NOT NULL               -- 'orange_money' | 'mtn_momo'
                     CHECK (mode_paiement IN ('orange_money', 'mtn_momo')),
  statut_paiement    VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                     CHECK (statut_paiement IN ('en_attente', 'paye', 'echoue')),
  reference_paiement VARCHAR(80),                       -- référence renvoyée par l'opérateur
  -- Cycle de vie de la commande, géré par le restaurateur :
  statut             VARCHAR(20) NOT NULL DEFAULT 'en_attente'
                     CHECK (statut IN ('en_attente', 'acceptee', 'en_preparation', 'prete', 'livree', 'annulee')),
  created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Lignes de commande : chaque plat commandé avec sa quantité.
-- On copie le nom et le prix au moment de la commande (historique fiable
-- même si le plat change ou est supprimé plus tard).
-- ------------------------------------------------------------
CREATE TABLE commande_items (
  id            SERIAL PRIMARY KEY,
  commande_id   INTEGER NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  plat_id       INTEGER REFERENCES plats(id) ON DELETE SET NULL,
  nom_plat      VARCHAR(150) NOT NULL,
  prix_unitaire INTEGER NOT NULL,
  quantite      INTEGER NOT NULL CHECK (quantite > 0)
);

CREATE INDEX idx_commandes_client ON commandes(client_id);
CREATE INDEX idx_commandes_restaurant ON commandes(restaurant_id);
CREATE INDEX idx_commande_items_commande ON commande_items(commande_id);
