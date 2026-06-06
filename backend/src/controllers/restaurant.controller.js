const pool = require('../config/db');

// Lister tous les restaurants
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM restaurants ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Voir un restaurant par ID
exports.getOne = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM restaurants WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant introuvable.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Créer un restaurant (restaurateur uniquement)
exports.create = async (req, res) => {
  if (req.user.role !== 'restaurateur') {
    return res.status(403).json({ message: 'Accès réservé aux restaurateurs.' });
  }

  const {
    nom, adresse, description, logo_url, horaires,
    delai_min, delai_max, frais_livraison, distance_km, latitude, longitude,
  } = req.body;
  if (!nom || !adresse) {
    return res.status(400).json({ message: 'Nom et adresse sont obligatoires.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO restaurants
         (nom, adresse, description, logo_url, horaires, delai_min, delai_max, frais_livraison, distance_km, latitude, longitude, proprietaire_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        nom, adresse, description, logo_url, horaires,
        delai_min || 20, delai_max || 40, frais_livraison || 0, distance_km || 0,
        latitude || null, longitude || null,
        req.user.id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Modifier un restaurant
exports.update = async (req, res) => {
  const {
    nom, adresse, description, logo_url, horaires,
    delai_min, delai_max, frais_livraison, distance_km, latitude, longitude,
  } = req.body;
  try {
    const check = await pool.query('SELECT * FROM restaurants WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Restaurant introuvable.' });
    if (check.rows[0].proprietaire_id !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    // COALESCE : on garde l'ancienne valeur si le champ n'est pas fourni.
    const actuel = check.rows[0];
    const result = await pool.query(
      `UPDATE restaurants SET
         nom=$1, adresse=$2, description=$3, logo_url=$4, horaires=$5,
         delai_min=$6, delai_max=$7, frais_livraison=$8, distance_km=$9,
         latitude=$10, longitude=$11
       WHERE id=$12 RETURNING *`,
      [
        nom, adresse, description, logo_url, horaires,
        delai_min ?? actuel.delai_min,
        delai_max ?? actuel.delai_max,
        frais_livraison ?? actuel.frais_livraison,
        distance_km ?? actuel.distance_km,
        latitude ?? actuel.latitude,
        longitude ?? actuel.longitude,
        req.params.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Supprimer un restaurant
exports.remove = async (req, res) => {
  try {
    const check = await pool.query('SELECT * FROM restaurants WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ message: 'Restaurant introuvable.' });
    if (check.rows[0].proprietaire_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    await pool.query('DELETE FROM restaurants WHERE id = $1', [req.params.id]);
    res.json({ message: 'Restaurant supprimé.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
