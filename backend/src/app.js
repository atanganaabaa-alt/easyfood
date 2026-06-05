const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes       = require('./routes/auth.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const platRoutes       = require('./routes/plat.routes');
const commandeRoutes   = require('./routes/commande.routes');
const uploadRoutes     = require('./routes/upload.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Sert les fichiers importés (images) en statique.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth',        authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/plats',       platRoutes);
app.use('/api/commandes',   commandeRoutes);
app.use('/api/upload',      uploadRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ message: '🍔 API EasyFood opérationnelle !' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
