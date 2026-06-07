# Déploiement d'EasyFood en production (VPS)

Ce guide décrit la mise en ligne d'EasyFood sur un VPS Ubuntu (22.04+).
Architecture cible :

- **PostgreSQL** : base de données
- **Backend Node/Express** : géré par **PM2**, écoute en local (port 5000)
- **Frontend React** : compilé en fichiers statiques, servi par **Nginx**
- **Nginx** : reverse-proxy (`/api` vers le backend) + service du frontend + HTTPS

---

## 1. Préparer le serveur

```bash
sudo apt update && sudo apt upgrade -y
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx git
sudo npm install -g pm2
```

## 2. Base de données

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE easyfood;
CREATE USER easyfood_user WITH ENCRYPTED PASSWORD 'mot_de_passe_solide';
GRANT ALL PRIVILEGES ON DATABASE easyfood TO easyfood_user;
\q
```

Charger le schéma puis les données de démo (facultatif en prod) :

```bash
cd /var/www/easyfood/backend/src/config
psql -U easyfood_user -d easyfood -f schema.sql
# Migrations (si la base existait déjà) :
psql -U easyfood_user -d easyfood -f migration_sprint3.sql
psql -U easyfood_user -d easyfood -f migration_sprint4.sql
# Données de démo (optionnel) :
node seed.js
```

## 3. Récupérer le code

```bash
sudo git clone https://github.com/atanganaabaa-alt/easyfood.git /var/www/easyfood
sudo chown -R $USER:$USER /var/www/easyfood
```

## 4. Backend

Créer `/var/www/easyfood/backend/.env` (ne jamais le committer) :

```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=easyfood
DB_USER=easyfood_user
DB_PASSWORD=mot_de_passe_solide
JWT_SECRET=remplacer_par_une_chaine_aleatoire_longue
```

```bash
cd /var/www/easyfood/backend
npm install --omit=dev
pm2 start src/app.js --name easyfood-api
pm2 save
pm2 startup   # suivre l'instruction affichée pour démarrer au boot
```

## 5. Frontend

Le frontend appelle l'API via `REACT_APP_API_URL`. En production, on passe par
Nginx, donc on utilise un chemin relatif `/api`.

```bash
cd /var/www/easyfood/frontend
echo "REACT_APP_API_URL=/api" > .env.production
npm install
npm run build
```

Le résultat est dans `frontend/build/`.

## 6. Nginx

Créer `/etc/nginx/sites-available/easyfood` :

```nginx
server {
    listen 80;
    server_name votre-domaine.cm;

    # Frontend (fichiers statiques React)
    root /var/www/easyfood/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # API backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Images importées (uploads)
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/easyfood /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.cm
```

## 8. Mises à jour

```bash
cd /var/www/easyfood
git pull
cd backend && npm install --omit=dev && pm2 restart easyfood-api
cd ../frontend && npm install && npm run build
sudo systemctl reload nginx
```

---

## Notes

- **Paiement Mobile Money / Notifications** : les services
  `paiement.service.js` et `notification.service.js` sont actuellement
  **simulés**. Pour la production, y brancher les vraies API
  (Orange Money, MTN MoMo, Twilio/SMS) en gardant la même interface.
- **Sécurité** : changer le `JWT_SECRET`, restreindre l'accès PostgreSQL au
  localhost, et envisager un rate-limiter (ex. `express-rate-limit`).
- **Application mobile React Native** : non incluse dans ce dépôt web.
  Elle constituerait un projet séparé (Expo ou React Native CLI) consommant
  la même API REST (`/api`).
