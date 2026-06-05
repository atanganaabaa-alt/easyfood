const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes       = require('./routes/auth.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const platRoutes       = require('./routes/plat.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',        authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/plats',       platRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ message: '🍔 API EasyFood opérationnelle !' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
