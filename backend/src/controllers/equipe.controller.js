// Gestion de l'équipe de livreurs d'un restaurateur (livraison v2).
const pool = require('../config/db');

const CHAMPS = 'id, nom, email, telephone, role, note, nb_courses, actif';

// Réservé aux restaurateurs.
function verifierRestaurateur(req, res) {
  if (req.user.role !== 'restaurateur') {
    res.status(403).json({ message: 'Accès réservé aux restaurateurs.' });
    return false;
  }
  return true;
}

// Liste des livreurs rattachés au restaurateur connecté.
exports.mesLivreurs = async (req, res) => {
  if (!verifierRestaurateur(req, res)) return;
  try {
    const result = await pool.query(
      `SELECT ${CHAMPS} FROM users
       WHERE role = 'livreur' AND employeur_id = $1
       ORDER BY nom`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Recrute un livreur (par email) dans son équipe.
exports.ajouterLivreur = async (req, res) => {
  if (!verifierRestaurateur(req, res)) return;
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "L'email du livreur est obligatoire." });
  try {
    const cible = await pool.query('SELECT id, role, employeur_id FROM users WHERE LOWER(email) = $1', [email]);
    if (cible.rows.length === 0) {
      return res.status(404).json({ message: 'Aucun compte avec cet email. Le livreur doit d\'abord créer son compte.' });
    }
    const livreur = cible.rows[0];
    if (livreur.role !== 'livreur') {
      return res.status(400).json({ message: 'Ce compte n\'est pas un compte livreur.' });
    }
    if (livreur.employeur_id && livreur.employeur_id !== req.user.id) {
      return res.status(409).json({ message: 'Ce livreur fait déjà partie d\'une autre équipe.' });
    }

    const result = await pool.query(
      `UPDATE users SET employeur_id = $1 WHERE id = $2 RETURNING ${CHAMPS}`,
      [req.user.id, livreur.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Retire un livreur de son équipe.
exports.retirerLivreur = async (req, res) => {
  if (!verifierRestaurateur(req, res)) return;
  try {
    const result = await pool.query(
      `UPDATE users SET employeur_id = NULL
       WHERE id = $1 AND employeur_id = $2 AND role = 'livreur'
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Livreur introuvable dans votre équipe.' });
    }
    res.json({ message: 'Livreur retiré de l\'équipe.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
