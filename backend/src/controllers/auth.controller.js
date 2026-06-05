const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// INSCRIPTION
exports.register = async (req, res) => {
  const { nom, email, mot_de_passe, telephone, role } = req.body;

  if (!nom || !email || !mot_de_passe || !role) {
    return res.status(400).json({ message: 'Tous les champs obligatoires doivent être remplis.' });
  }

  const rolesValides = ['client', 'restaurateur', 'livreur', 'admin'];
  if (!rolesValides.includes(role)) {
    return res.status(400).json({ message: 'Rôle invalide.' });
  }

  try {
    // Vérifier si l'email existe déjà
    const existant = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existant.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }

    // Chiffrer le mot de passe
    const hash = await bcrypt.hash(mot_de_passe, 10);

    // Insérer l'utilisateur
    const result = await pool.query(
      'INSERT INTO users (nom, email, mot_de_passe, telephone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, nom, email, role',
      [nom, email, hash, telephone, role]
    );

    const user = result.rows[0];

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Inscription réussie !', token, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// CONNEXION
exports.login = async (req, res) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const user = result.rows[0];
    const motDePasseValide = await bcrypt.compare(mot_de_passe, user.mot_de_passe);

    if (!motDePasseValide) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie !',
      token,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// PROFIL (route protégée)
exports.profil = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, email, telephone, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
