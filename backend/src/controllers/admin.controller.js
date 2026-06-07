// Back-office administrateur : statistiques, utilisateurs, commissions.
const pool = require('../config/db');
const { tauxCommission, ecrire } = require('../services/parametres.service');

// Champs utilisateur renvoyés à l'admin (jamais le mot de passe).
const CHAMPS_USER = 'id, nom, email, telephone, role, actif, valide, note, nb_courses, created_at';

// ------------------------------------------------------------
// TABLEAU DE BORD : statistiques globales
// ------------------------------------------------------------
exports.stats = async (req, res) => {
  try {
    const [jour, ca, livraison, satisfaction, commissions, utilisateurs] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM commandes
         WHERE created_at >= CURRENT_DATE AND statut_paiement = 'paye'`
      ),
      pool.query(
        `SELECT COALESCE(SUM(total), 0)::int AS total FROM commandes
         WHERE created_at >= CURRENT_DATE AND statut_paiement = 'paye'`
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE statut = 'livree')::int AS livrees,
           COUNT(*) FILTER (WHERE statut != 'annulee')::int AS total
         FROM commandes WHERE statut_paiement = 'paye'`
      ),
      pool.query(
        `SELECT COALESCE(ROUND(AVG(note_restaurant)::numeric, 1), 0) AS moyenne,
                COUNT(*)::int AS nb_avis
         FROM evaluations`
      ),
      pool.query(
        `SELECT COALESCE(SUM(commission), 0)::int AS total_jour,
                COALESCE(SUM(commission) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::int AS total_mois
         FROM commandes WHERE statut_paiement = 'paye'`
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE role = 'client')::int AS clients,
           COUNT(*) FILTER (WHERE role = 'restaurateur')::int AS restaurateurs,
           COUNT(*) FILTER (WHERE role = 'livreur')::int AS livreurs,
           COUNT(*) FILTER (WHERE role = 'restaurateur' AND valide = false)::int AS resto_en_attente
         FROM users WHERE role != 'admin'`
      ),
    ]);

    const liv = livraison.rows[0];
    const tauxLivraison = liv.total > 0 ? Math.round((liv.livrees / liv.total) * 100) : 0;
    const taux = await tauxCommission();

    res.json({
      commandes_jour: jour.rows[0].total,
      chiffre_affaires_jour: ca.rows[0].total,
      taux_livraison: tauxLivraison,
      satisfaction: Number(satisfaction.rows[0].moyenne),
      nb_avis: satisfaction.rows[0].nb_avis,
      commission_jour: commissions.rows[0].total_jour,
      commission_mois: commissions.rows[0].total_mois,
      taux_commission: taux,
      utilisateurs: utilisateurs.rows[0],
    });
  } catch (err) {
    console.error('Erreur stats admin :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// LISTE DES UTILISATEURS (filtres optionnels : role, actif, valide, q)
// ------------------------------------------------------------
exports.listeUtilisateurs = async (req, res) => {
  try {
    const { role, actif, valide, q } = req.query;
    const conditions = ["role != 'admin'"];
    const params = [];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }
    if (actif !== undefined && actif !== '') {
      params.push(actif === 'true');
      conditions.push(`actif = $${params.length}`);
    }
    if (valide !== undefined && valide !== '') {
      params.push(valide === 'true');
      conditions.push(`valide = $${params.length}`);
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      conditions.push(`(LOWER(nom) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
    }

    const result = await pool.query(
      `SELECT ${CHAMPS_USER} FROM users
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// SUSPENDRE / RÉACTIVER un compte
// ------------------------------------------------------------
exports.modifierStatut = async (req, res) => {
  const { actif } = req.body;
  if (typeof actif !== 'boolean') {
    return res.status(400).json({ message: 'Le champ actif (true/false) est obligatoire.' });
  }
  try {
    const cible = await pool.query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
    if (cible.rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (cible.rows[0].role === 'admin') {
      return res.status(403).json({ message: 'Impossible de modifier un administrateur.' });
    }

    const result = await pool.query(
      `UPDATE users SET actif = $1 WHERE id = $2 RETURNING ${CHAMPS_USER}`,
      [actif, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// VALIDER un restaurateur (autorise la mise en ligne de son restaurant)
// ------------------------------------------------------------
exports.validerRestaurateur = async (req, res) => {
  try {
    const cible = await pool.query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
    if (cible.rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (cible.rows[0].role !== 'restaurateur') {
      return res.status(400).json({ message: 'Seuls les restaurateurs peuvent être validés.' });
    }

    const result = await pool.query(
      `UPDATE users SET valide = true WHERE id = $1 RETURNING ${CHAMPS_USER}`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// SUPPRIMER un utilisateur
// ------------------------------------------------------------
exports.supprimerUtilisateur = async (req, res) => {
  try {
    const cible = await pool.query('SELECT id, role FROM users WHERE id = $1', [req.params.id]);
    if (cible.rows.length === 0) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (cible.rows[0].role === 'admin') {
      return res.status(403).json({ message: 'Impossible de supprimer un administrateur.' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// COMMISSION : lire / modifier le taux
// ------------------------------------------------------------
exports.getCommission = async (req, res) => {
  try {
    const taux = await tauxCommission();
    const totaux = await pool.query(
      `SELECT COALESCE(SUM(commission), 0)::int AS total,
              COUNT(*)::int AS nb_commandes
       FROM commandes WHERE statut_paiement = 'paye' AND commission > 0`
    );
    res.json({ taux_commission: taux, ...totaux.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.setCommission = async (req, res) => {
  const taux = Number(req.body.taux_commission);
  if (!Number.isFinite(taux) || taux < 0 || taux > 0.5) {
    return res.status(400).json({ message: 'Le taux doit être entre 0 et 0.5 (50 %).' });
  }
  try {
    await ecrire('taux_commission', taux);
    res.json({ message: 'Taux de commission mis à jour.', taux_commission: taux });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// CATÉGORIES distinctes (pour les filtres côté client)
// ------------------------------------------------------------
exports.categories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT categorie FROM restaurants
       WHERE categorie IS NOT NULL AND categorie != ''
       ORDER BY categorie`
    );
    res.json(result.rows.map((r) => r.categorie));
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
