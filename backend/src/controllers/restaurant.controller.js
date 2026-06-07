const pool = require('../config/db');

// Lister les restaurants (filtres : q, categorie, note_min, distance_max).
// Seuls les restaurants dont le propriétaire est validé et actif sont visibles.
exports.getAll = async (req, res) => {
  try {
    const { q, categorie, note_min, distance_max } = req.query;
    const conditions = ['u.valide = true', 'u.actif = true'];
    const params = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      conditions.push(`(LOWER(r.nom) LIKE $${params.length} OR LOWER(r.adresse) LIKE $${params.length} OR LOWER(r.description) LIKE $${params.length})`);
    }
    if (categorie) {
      params.push(categorie);
      conditions.push(`r.categorie = $${params.length}`);
    }
    if (note_min) {
      params.push(Number(note_min));
      conditions.push(`r.note >= $${params.length}`);
    }
    if (distance_max) {
      params.push(Number(distance_max));
      conditions.push(`r.distance_km <= $${params.length}`);
    }

    const result = await pool.query(
      `SELECT r.* FROM restaurants r
       JOIN users u ON u.id = r.proprietaire_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Catégories distinctes (filtre public).
exports.categories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT r.categorie FROM restaurants r
       JOIN users u ON u.id = r.proprietaire_id
       WHERE u.valide = true AND u.actif = true
         AND r.categorie IS NOT NULL AND r.categorie != ''
       ORDER BY r.categorie`
    );
    res.json(result.rows.map((row) => row.categorie));
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

  const proprio = await pool.query('SELECT valide, actif FROM users WHERE id = $1', [req.user.id]);
  if (!proprio.rows[0]?.actif) {
    return res.status(403).json({ message: 'Votre compte est suspendu.' });
  }
  if (!proprio.rows[0]?.valide) {
    return res.status(403).json({ message: 'Votre compte restaurateur est en attente de validation par un administrateur.' });
  }

  const {
    nom, adresse, description, logo_url, horaires, categorie,
    delai_min, delai_max, frais_livraison, distance_km, latitude, longitude,
  } = req.body;
  if (!nom || !adresse) {
    return res.status(400).json({ message: 'Nom et adresse sont obligatoires.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO restaurants
         (nom, adresse, description, logo_url, horaires, categorie, delai_min, delai_max, frais_livraison, distance_km, latitude, longitude, proprietaire_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        nom, adresse, description, logo_url, horaires, categorie || null,
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
    nom, adresse, description, logo_url, horaires, categorie,
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
         nom=$1, adresse=$2, description=$3, logo_url=$4, horaires=$5, categorie=$6,
         delai_min=$7, delai_max=$8, frais_livraison=$9, distance_km=$10,
         latitude=$11, longitude=$12
       WHERE id=$13 RETURNING *`,
      [
        nom, adresse, description, logo_url, horaires, categorie ?? actuel.categorie,
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
