const pool = require('../config/db');

// Lister les plats d'un restaurant
exports.getByRestaurant = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM plats WHERE restaurant_id = $1 ORDER BY created_at DESC',
      [req.params.restaurantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Créer un plat
exports.create = async (req, res) => {
  const { nom, description, prix, photo_url, restaurant_id } = req.body;
  if (!nom || !prix || !restaurant_id) {
    return res.status(400).json({ message: 'Nom, prix et restaurant_id sont obligatoires.' });
  }

  try {
    // Vérifier que le restaurant appartient bien à ce restaurateur
    const check = await pool.query(
      'SELECT * FROM restaurants WHERE id = $1 AND proprietaire_id = $2',
      [restaurant_id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    const result = await pool.query(
      'INSERT INTO plats (nom, description, prix, photo_url, restaurant_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nom, description, prix, photo_url, restaurant_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Modifier un plat
exports.update = async (req, res) => {
  const { nom, description, prix, photo_url, disponible } = req.body;
  try {
    const result = await pool.query(
      'UPDATE plats SET nom=$1, description=$2, prix=$3, photo_url=$4, disponible=$5 WHERE id=$6 RETURNING *',
      [nom, description, prix, photo_url, disponible, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Plat introuvable.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Supprimer un plat
exports.remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM plats WHERE id = $1', [req.params.id]);
    res.json({ message: 'Plat supprimé.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
