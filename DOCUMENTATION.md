# Documentation EasyFood

Plateforme de commande et de livraison de repas pour le marché camerounais
(paiements en XAF, Orange Money & MTN MoMo).

Ce document explique **tout le projet** : la stack, l'architecture, ce qui a
été construit à chaque étape, les outils utilisés et **comment tester** (avec
les commandes prêtes à copier-coller).

---

## Sommaire

1. [Présentation](#1-présentation)
2. [Stack technique et outils](#2-stack-technique-et-outils)
3. [Architecture et structure des dossiers](#3-architecture-et-structure-des-dossiers)
4. [Étapes du projet (sprint par sprint)](#4-étapes-du-projet-sprint-par-sprint)
5. [Modèle de données](#5-modèle-de-données)
6. [Installation et démarrage](#6-installation-et-démarrage)
7. [Configuration (.env)](#7-configuration-env)
8. [Comptes de démonstration](#8-comptes-de-démonstration)
9. [Référence de l'API](#9-référence-de-lapi)
10. [Guide de test (commandes curl)](#10-guide-de-test-commandes-curl)
11. [Paiement Mobile Money](#11-paiement-mobile-money)
12. [Déploiement](#12-déploiement)
13. [Problèmes rencontrés et solutions](#13-problèmes-rencontrés-et-solutions)

---

## 1. Présentation

EasyFood permet à un **client** de comparer des restaurants (prix, temps,
distance), de commander, de payer par Mobile Money et de suivre sa livraison en
temps réel. Un **restaurateur** gère son restaurant, son menu et son équipe de
livreurs. Un **livreur** reçoit des missions et confirme les livraisons. Un
**administrateur** supervise la plateforme (statistiques, comptes, commissions).

Quatre rôles : `client`, `restaurateur`, `livreur`, `admin`.

---

## 2. Stack technique et outils

| Domaine        | Technologie / Outil                  | Rôle |
|----------------|--------------------------------------|------|
| Frontend Web   | React 19 (Create React App)          | Interface utilisateur |
| Routing        | react-router-dom                     | Navigation SPA |
| Requêtes HTTP  | axios                                | Appels API |
| État global    | React Context (`AuthContext`, `CartContext`) | Session + panier |
| Cartes         | react-leaflet + leaflet + OpenStreetMap | Carte et suivi GPS |
| Backend        | Node.js + Express 5                  | API REST |
| Base de données| PostgreSQL (librairie `pg`)          | Stockage |
| Auth           | jsonwebtoken (JWT) + bcryptjs        | Connexion sécurisée |
| Upload fichiers| multer                               | Import photos |
| Config         | dotenv                               | Variables d'environnement |
| Paiement       | MTN MoMo Collections, Orange Money WebPay (via `fetch`) | Encaissement |
| Versionnage    | git + GitHub                         | Code source |

**Pourquoi ces choix ?** Stack JavaScript de bout en bout (un seul langage),
PostgreSQL pour les relations et les transactions, JWT pour une auth sans
session serveur, et des services de paiement/notification « branchables »
(simulation en dev, vraies API en prod) pour ne jamais bloquer le développement.

---

## 3. Architecture et structure des dossiers

API REST stateless. Le frontend (SPA React) consomme l'API ; en production,
Nginx sert les fichiers statiques et relaie `/api` vers le backend.

```
easyfood/
├── DOCUMENTATION.md          ← ce document
├── DEPLOIEMENT.md            ← guide de mise en production VPS
├── .cursorrules              ← consignes projet pour l'IA Cursor
├── backend/
│   ├── .env.example          ← modèle de configuration
│   └── src/
│       ├── app.js            ← point d'entrée Express (montage des routes)
│       ├── config/
│       │   ├── db.js         ← connexion PostgreSQL (pool)
│       │   ├── schema.sql    ← schéma complet (install neuve)
│       │   ├── seed.js       ← données de démo
│       │   └── migration_*.sql ← migrations incrémentales
│       ├── routes/           ← définition des routes par domaine
│       ├── controllers/      ← logique métier
│       ├── middlewares/      ← auth.middleware (JWT), admin.middleware
│       └── services/         ← paiement, notification, parametres
└── frontend/
    └── src/
        ├── index.js          ← montage React + providers (Auth, Cart)
        ├── App.js            ← routes de l'application + gardes de rôle
        ├── services/api.js   ← instance axios (baseURL + token)
        ├── context/          ← AuthContext, CartContext
        ├── components/       ← Navbar, ImageUpload, Etoiles, CarteRestaurants, CarteSuivi
        ├── pages/            ← Accueil, Restaurants, RestaurantDetail, Panier,
        │                       Checkout, MesCommandes, Connexion, Inscription,
        │                       TableauRestaurateur, TableauLivreur, TableauAdmin
        └── utils/format.js   ← formats (prix, dates), distance (Haversine), scores
```

**Cycle d'une requête authentifiée :** le frontend envoie le JWT dans l'en-tête
`Authorization: Bearer <token>` → `auth.middleware` vérifie le token et place
`req.user` → le contrôleur applique les règles de rôle → réponse JSON.

---

## 4. Étapes du projet (sprint par sprint)

### Étape 0 — Mise en place
- Création du dépôt, `.gitignore` (exclut `node_modules`, `.env`, `build`),
  `.cursorrules` (consignes : async/await, commentaires en français,
  variables en anglais camelCase, gestion d'erreurs try/catch).
- **Outils :** `git init`, structure `/backend` + `/frontend`.

### Sprint 1 — La base : s'inscrire et voir les restaurants
- **Inscription / connexion** multi-rôles, mot de passe haché (`bcryptjs`),
  token **JWT** (`jsonwebtoken`).
- **CRUD restaurants et plats** côté restaurateur ; **listes et détails**
  côté client (axios + react-router).
- Base **PostgreSQL** : tables `users`, `restaurants`, `plats`.
- **Données de démo** via `seed.js`.

### Design — Style clair, comparaison de restaurants
- Thème clair (fond blanc, CTA noir, accents verts), responsive.
- Cartes restaurant avec **note, délai, distance, frais**, chips de tri
  (« Meilleur choix », « Le plus rapide »…), badge « Meilleur choix » calculé.

### Import de photos + réduction des emojis
- **multer** pour l'upload (5 Mo max, JPG/PNG/WEBP/GIF), fichiers servis en
  statique sur `/uploads`. Composant React `ImageUpload` (glisser-déposer).
- Emojis décoratifs retirés des titres/messages (icônes fonctionnelles gardées).

### Sprint 2 — Commander et payer
- **Panier** côté client (`CartContext`, persistance `localStorage`, une seule
  enseigne par panier).
- **Commande** avec adresse + téléphone, **paiement Mobile Money** simulé
  (`paiement.service.js`), **notifications** simulées (`notification.service.js`).
- Tables `commandes` et `commande_items` (transactions SQL).
- **Tableau restaurateur** avec réception des commandes (polling) et gestion
  des statuts ; **historique client**.

### Sprint 3 — Livraison et évaluations
- Rôle **livreur** : missions disponibles, accepter, confirmer la livraison.
- **Suivi temps réel** côté client (timeline `en_preparation → en_livraison → livree`).
- **Géolocalisation** (formule de **Haversine**) pour distance et frais.
- **Évaluations** (note restaurant + livreur), table `evaluations`.
- **Carte** des restaurants (`react-leaflet`) + tri par proximité/coût.

### Sprint 4 — Back-office et finition
- **Tableau de bord admin** : commandes du jour, chiffre d'affaires, taux de
  livraison, satisfaction, commissions, répartition des comptes.
- **Gestion des comptes** : suspendre/réactiver, supprimer, **valider un
  restaurateur** (un restaurateur non validé ne peut pas publier).
- **Commissions** paramétrables (table `parametres`), appliquées à chaque
  commande payée.
- **Filtres restaurants** : catégorie, note, distance.
- **Migration** `migration_sprint4.sql` + guide `DEPLOIEMENT.md`.

### Livraison v2 — Suivi live, équipes, paiement réel
- **Suivi GPS en direct** : le livreur partage sa position (`watchPosition`),
  le client la voit sur une carte (`CarteSuivi` : restaurant + livreur).
- Coordonnées GPS + catégorie ajoutées au profil restaurant.
- **Équipes de livreurs** : le restaurateur recrute ses livreurs par email
  (`employeur_id`) ; un livreur ne voit que les commandes de son employeur.
- **Paiement réel** Orange/MTN activable par `PAIEMENT_MODE=reel`.
- **Migration** `migration_livraison_v2.sql`.

---

## 5. Modèle de données

Tables principales (PostgreSQL) :

- **users** — `id, nom, email, mot_de_passe (haché), telephone, role`
  (`client|restaurateur|livreur|admin`), `note, nb_courses`,
  `actif` (suspension), `valide` (validation restaurateur),
  `employeur_id` (restaurateur d'un livreur), `created_at`.
- **restaurants** — `id, nom, adresse, description, logo_url, horaires,
  categorie, note, delai_min, delai_max, frais_livraison, distance_km,
  latitude, longitude, nb_evaluations, proprietaire_id`.
- **plats** — `id, nom, description, prix, photo_url, disponible, restaurant_id`.
- **commandes** — `id, client_id, restaurant_id, adresse_livraison, telephone,
  sous_total, frais_livraison, total, commission, mode_paiement,
  statut_paiement, reference_paiement, statut, livreur_id, livreur_lat,
  livreur_lng, created_at`.
  - `statut` ∈ `en_attente, acceptee, en_preparation, prete, en_livraison, livree, annulee`.
  - `mode_paiement` ∈ `orange_money, mtn_momo`.
- **commande_items** — `id, commande_id, plat_id, nom_plat, prix_unitaire, quantite`.
- **evaluations** — `id, commande_id, client_id, restaurant_id, livreur_id,
  note_restaurant (1-5), note_livreur (1-5), commentaire`.
- **parametres** — `cle, valeur` (ex. `taux_commission = 0.10`).

**Migrations** (à appliquer dans l'ordre sur une base existante) :
`migration_sprint3.sql` → `migration_sprint4.sql` → `migration_livraison_v2.sql`.
Une **installation neuve** charge directement `schema.sql` (déjà à jour).

---

## 6. Installation et démarrage

### Prérequis
- Node.js 18+ (20 LTS recommandé), npm
- PostgreSQL 14+

### 6.1 Base de données
```bash
# Créer la base (adapter l'utilisateur/mot de passe)
sudo -u postgres psql -c "CREATE DATABASE easyfood;"

# Charger le schéma complet
cd backend/src/config
psql -U postgres -d easyfood -f schema.sql

# (Optionnel) données de démo
cd ../../          # -> dossier backend
node src/config/seed.js
```

### 6.2 Backend
```bash
cd backend
cp .env.example .env     # puis renseigner DB_* et JWT_SECRET
npm install
npm start                # http://localhost:5000
```

### 6.3 Frontend
```bash
cd frontend
npm install
npm start                # http://localhost:3000
```

Le frontend appelle l'API via `frontend/src/services/api.js`
(`baseURL` = `http://localhost:5000/api` en dev).

---

## 7. Configuration (.env)

Fichier `backend/.env` (modèle : `backend/.env.example`) :

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easyfood
DB_USER=postgres
DB_PASSWORD=...
JWT_SECRET=chaine_aleatoire_longue

# Paiement : 'simulation' (défaut) ou 'reel'
PAIEMENT_MODE=simulation
# Clés MTN MoMo (si reel)
MTN_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_SUBSCRIPTION_KEY=
MTN_API_USER=
MTN_API_KEY=
MTN_TARGET_ENV=sandbox
MTN_CURRENCY=EUR
# Clés Orange Money (si reel)
ORANGE_BASE_URL=https://api.orange.com
ORANGE_CLIENT_ID=
ORANGE_CLIENT_SECRET=
ORANGE_MERCHANT_KEY=
ORANGE_COUNTRY=cm
ORANGE_CURRENCY=XAF
```

---

## 8. Comptes de démonstration

Mot de passe commun : **`easyfood123`**

| Rôle          | Email                  |
|---------------|------------------------|
| Client        | `client@easyfood.cm`   |
| Restaurateur  | `resto@easyfood.cm`    |
| Livreur       | `livreur@easyfood.cm`  |
| Admin         | `admin@easyfood.cm`    |

Le livreur de démo est rattaché au restaurateur de démo (équipe).

---

## 9. Référence de l'API

Base : `http://localhost:5000/api`. Les routes protégées exigent l'en-tête
`Authorization: Bearer <token>`.

### Authentification — `/api/auth`
| Méthode | Chemin       | Accès    | Description |
|---------|--------------|----------|-------------|
| POST    | `/register`  | public   | Inscription (renvoie token + user) |
| POST    | `/login`     | public   | Connexion (bloquée si compte suspendu) |
| GET     | `/profil`    | connecté | Profil de l'utilisateur courant |

### Restaurants — `/api/restaurants`
| Méthode | Chemin              | Accès        | Description |
|---------|---------------------|--------------|-------------|
| GET     | `/`                 | public       | Liste (filtres `q, categorie, note_min, distance_max`) |
| GET     | `/meta/categories`  | public       | Catégories distinctes |
| GET     | `/:id`              | public       | Détail d'un restaurant |
| POST    | `/`                 | restaurateur | Créer (compte validé + actif requis) |
| PUT     | `/:id`              | restaurateur | Modifier |
| DELETE  | `/:id`              | restaurateur | Supprimer |

### Plats — `/api/plats`
| Méthode | Chemin                     | Accès        | Description |
|---------|----------------------------|--------------|-------------|
| GET     | `/restaurant/:restaurantId`| public       | Plats d'un restaurant |
| POST    | `/`                        | restaurateur | Ajouter un plat |
| PUT     | `/:id`                     | restaurateur | Modifier / (dé)activer |
| DELETE  | `/:id`                     | restaurateur | Supprimer |

### Commandes — `/api/commandes`
| Méthode | Chemin            | Accès        | Description |
|---------|-------------------|--------------|-------------|
| POST    | `/`               | client       | Passer commande (paiement + notifs) |
| GET     | `/mes`            | client       | Historique du client |
| GET     | `/restaurant`     | restaurateur | Commandes reçues |
| GET     | `/missions`       | livreur      | Missions prêtes de son employeur |
| GET     | `/mes-missions`   | livreur      | Ses livraisons |
| GET     | `/:id`            | connecté     | Détail d'une commande |
| PUT     | `/:id/statut`     | restaurateur | Changer le statut (jusqu'à `prete`) |
| PUT     | `/:id/accepter`   | livreur      | Accepter une mission (`en_livraison`) |
| PUT     | `/:id/position`   | livreur      | Mettre à jour sa position GPS |
| PUT     | `/:id/livrer`     | livreur      | Confirmer la livraison (`livree`) |
| POST    | `/:id/evaluation` | client       | Noter restaurant + livreur |

### Équipe de livraison — `/api/equipe`
| Méthode | Chemin           | Accès        | Description |
|---------|------------------|--------------|-------------|
| GET     | `/livreurs`      | restaurateur | Ses livreurs |
| POST    | `/livreurs`      | restaurateur | Recruter par email |
| DELETE  | `/livreurs/:id`  | restaurateur | Retirer de l'équipe |

### Administration — `/api/admin` (rôle admin uniquement)
| Méthode | Chemin                     | Description |
|---------|----------------------------|-------------|
| GET     | `/stats`                   | Statistiques globales |
| GET     | `/utilisateurs`            | Liste (filtres `role, actif, valide, q`) |
| PUT     | `/utilisateurs/:id/statut` | Suspendre / réactiver (`{actif:bool}`) |
| PUT     | `/utilisateurs/:id/valider`| Valider un restaurateur |
| DELETE  | `/utilisateurs/:id`        | Supprimer un utilisateur |
| GET     | `/commission`              | Taux + total perçu |
| PUT     | `/commission`              | Modifier le taux (`{taux_commission:0..0.5}`) |
| GET     | `/categories`              | Catégories distinctes |

### Upload — `/api/upload`
| Méthode | Chemin | Accès    | Description |
|---------|--------|----------|-------------|
| POST    | `/`    | connecté | Upload image (champ `image`), renvoie `{url}` |

---

## 10. Guide de test (commandes curl)

> Pré-requis : backend lancé sur `localhost:5000` et base alimentée (`seed.js`).
> Astuce : on stocke le token dans une variable shell.

### 10.1 Connexion et récupération d'un token
```bash
api=http://localhost:5000/api

# Fonction utilitaire : renvoie le token d'un compte de démo
tok() { curl -s -X POST $api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"mot_de_passe\":\"easyfood123\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4; }

TCLIENT=$(tok client@easyfood.cm)
TRESTO=$(tok resto@easyfood.cm)
TLIVREUR=$(tok livreur@easyfood.cm)
TADMIN=$(tok admin@easyfood.cm)
echo "Tokens récupérés."
```

### 10.2 Restaurants : liste, filtres, catégories
```bash
curl -s $api/restaurants | head
curl -s "$api/restaurants?categorie=Grillades"
curl -s "$api/restaurants?note_min=4.5"
curl -s "$api/restaurants?distance_max=5"
curl -s $api/restaurants/meta/categories
```

### 10.3 Flux de commande complet (client → restaurateur → livreur)
```bash
# 1) Le client passe une commande (restaurant 1, plat 1)
CMD=$(curl -s -X POST $api/commandes -H "Authorization: Bearer $TCLIENT" \
  -H 'Content-Type: application/json' \
  -d '{"restaurant_id":1,"items":[{"plat_id":1,"quantite":2}],
       "adresse_livraison":"Bonapriso, Douala","telephone":"+237699000000",
       "mode_paiement":"orange_money"}')
CID=$(echo "$CMD" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "Commande #$CID créée"

# 2) Le restaurateur fait progresser la commande jusqu'à "prête"
for S in acceptee en_preparation prete; do
  curl -s -X PUT $api/commandes/$CID/statut -H "Authorization: Bearer $TRESTO" \
    -H 'Content-Type: application/json' -d "{\"statut\":\"$S\"}" \
    -o /dev/null -w "statut $S -> %{http_code}\n"
done

# 3) Le livreur voit la mission, l'accepte, partage sa position, puis livre
curl -s $api/commandes/missions -H "Authorization: Bearer $TLIVREUR"
curl -s -X PUT $api/commandes/$CID/accepter -H "Authorization: Bearer $TLIVREUR"
curl -s -X PUT $api/commandes/$CID/position -H "Authorization: Bearer $TLIVREUR" \
  -H 'Content-Type: application/json' -d '{"lat":4.0490,"lng":9.7100}'
curl -s -X PUT $api/commandes/$CID/livrer -H "Authorization: Bearer $TLIVREUR"

# 4) Le client consulte ses commandes (statut, position livreur/resto)
curl -s $api/commandes/mes -H "Authorization: Bearer $TCLIENT"

# 5) Le client évalue (note restaurant + livreur)
curl -s -X POST $api/commandes/$CID/evaluation -H "Authorization: Bearer $TCLIENT" \
  -H 'Content-Type: application/json' \
  -d '{"note_restaurant":5,"note_livreur":5,"commentaire":"Parfait !"}'
```

### 10.4 Équipe de livraison (restaurateur)
```bash
# Lister son équipe
curl -s $api/equipe/livreurs -H "Authorization: Bearer $TRESTO"
# Recruter un livreur (le compte livreur doit déjà exister)
curl -s -X POST $api/equipe/livreurs -H "Authorization: Bearer $TRESTO" \
  -H 'Content-Type: application/json' -d '{"email":"livreur@easyfood.cm"}'
# Retirer un livreur (remplacer 3 par son id)
curl -s -X DELETE $api/equipe/livreurs/3 -H "Authorization: Bearer $TRESTO"
```

### 10.5 Back-office administrateur
```bash
# Statistiques
curl -s $api/admin/stats -H "Authorization: Bearer $TADMIN"
# Liste des utilisateurs (filtre par rôle)
curl -s "$api/admin/utilisateurs?role=livreur" -H "Authorization: Bearer $TADMIN"
# Suspendre puis réactiver l'utilisateur 3
curl -s -X PUT $api/admin/utilisateurs/3/statut -H "Authorization: Bearer $TADMIN" \
  -H 'Content-Type: application/json' -d '{"actif":false}'
curl -s -X PUT $api/admin/utilisateurs/3/statut -H "Authorization: Bearer $TADMIN" \
  -H 'Content-Type: application/json' -d '{"actif":true}'
# Valider le restaurateur 8
curl -s -X PUT $api/admin/utilisateurs/8/valider -H "Authorization: Bearer $TADMIN"
# Lire / modifier le taux de commission (15 %)
curl -s $api/admin/commission -H "Authorization: Bearer $TADMIN"
curl -s -X PUT $api/admin/commission -H "Authorization: Bearer $TADMIN" \
  -H 'Content-Type: application/json' -d '{"taux_commission":0.15}'
```

### 10.6 Vérifications de sécurité (doivent échouer)
```bash
# Un client n'accède pas au back-office (403)
curl -s $api/admin/stats -H "Authorization: Bearer $TCLIENT" -o /dev/null -w "%{http_code}\n"
# Sans token (401)
curl -s $api/commandes/mes -o /dev/null -w "%{http_code}\n"
# Compte suspendu -> connexion bloquée (403)
curl -s -X PUT $api/admin/utilisateurs/3/statut -H "Authorization: Bearer $TADMIN" \
  -H 'Content-Type: application/json' -d '{"actif":false}' -o /dev/null
curl -s -X POST $api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"livreur@easyfood.cm","mot_de_passe":"easyfood123"}' \
  -o /dev/null -w "%{http_code}\n"
# (penser à réactiver le compte ensuite)
```

### 10.7 Upload d'une image
```bash
curl -s -X POST $api/upload -H "Authorization: Bearer $TRESTO" \
  -F "image=@/chemin/vers/photo.jpg"
# -> { "url": "http://localhost:5000/uploads/<fichier>" }
```

---

## 11. Paiement Mobile Money

Deux modes, pilotés par `PAIEMENT_MODE` :

- **`simulation`** (défaut) : le paiement est auto-validé. Idéal pour le dev et
  les démos — aucune clé requise.
- **`reel`** : appelle réellement les API opérateurs.
  - **MTN MoMo Collections** : récupération d'un token, puis `requesttopay`
    (le client valide sur son téléphone), statut vérifiable.
  - **Orange Money WebPay** : token OAuth, puis création d'un paiement web ;
    confirmation par webhook (`notif_url`).

**Sécurité importante :** l'application ne demande **jamais** le code PIN /
mot de passe Mobile Money. Le client valide la transaction **sur son propre
téléphone** via la notification de l'opérateur. EasyFood se contente d'initier
la demande et de vérifier le statut.

Les notifications SMS/WhatsApp (`notification.service.js`) sont également
simulées (logs) et prêtes à brancher sur Twilio / SMS API Orange.

---

## 12. Déploiement

Voir **`DEPLOIEMENT.md`** : VPS Ubuntu, PostgreSQL, backend géré par **PM2**,
frontend compilé (`npm run build`) servi par **Nginx** (reverse-proxy `/api` +
`/uploads`), HTTPS via Let's Encrypt, et procédure de mise à jour.

**Hors périmètre du dépôt web :** l'application mobile **React Native**
(projet séparé qui consommerait la même API REST).

---

## 13. Problèmes rencontrés et solutions

| Problème | Cause | Solution |
|----------|-------|----------|
| Build frontend qui échoue (`ECONNRESET`, `Missing script`) | Réseau instable / mauvais dossier | `cd frontend` puis `npm run build` ; relancer l'install |
| Connexion PostgreSQL refusée | Restrictions d'environnement | Lancer `psql` avec les droits adéquats ; `PGPASSWORD` pour le non-interactif |
| `seed.js` qui ne se termine pas | Client de test non libéré | Ajout de `client.release()` après le test de connexion dans `db.js` |
| Redirection erronée après commande | Panier vidé avant la navigation | État `commandeOk` dans `Checkout.js` pour piloter la redirection |
| Routes admin « Cannot GET » | Backend démarré avant l'ajout des routes | Redémarrer le backend après modification des routes |
| Connexion d'un compte suspendu | — | Vérification `actif` au login (403 si suspendu) |

---

*Document généré pour le projet EasyFood. Pour la mise en production détaillée,
se référer à `DEPLOIEMENT.md`.*
