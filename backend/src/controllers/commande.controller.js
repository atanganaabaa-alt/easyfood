const pool = require('../config/db');
const { initierPaiement } = require('../services/paiement.service');
const { envoyerNotification } = require('../services/notification.service');

// Statuts qu'un restaurateur peut appliquer (il gère jusqu'à "prête",
// ensuite c'est le livreur qui prend le relais).
const STATUTS_VALIDES = ['acceptee', 'en_preparation', 'prete', 'annulee'];

// Libellés lisibles pour les notifications.
const LIBELLES_STATUT = {
  acceptee: 'acceptée',
  en_preparation: 'en préparation',
  prete: 'prête',
  en_livraison: 'en cours de livraison',
  livree: 'livrée',
  annulee: 'annulée',
};

// Récupère une commande complète (avec ses lignes) au format JSON.
async function commandeComplete(commandeId) {
  const cmd = await pool.query('SELECT * FROM commandes WHERE id = $1', [commandeId]);
  if (cmd.rows.length === 0) return null;
  const items = await pool.query(
    'SELECT * FROM commande_items WHERE commande_id = $1 ORDER BY id',
    [commandeId]
  );
  return { ...cmd.rows[0], items: items.rows };
}

// ------------------------------------------------------------
// CRÉER UNE COMMANDE (client) + paiement mobile money
// ------------------------------------------------------------
exports.create = async (req, res) => {
  const { restaurant_id, items, adresse_livraison, telephone, mode_paiement } = req.body;

  if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Restaurant et plats sont obligatoires.' });
  }
  if (!adresse_livraison || !telephone) {
    return res.status(400).json({ message: "L'adresse de livraison et le téléphone sont obligatoires." });
  }
  if (!['orange_money', 'mtn_momo'].includes(mode_paiement)) {
    return res.status(400).json({ message: 'Mode de paiement invalide.' });
  }

  const client = await pool.connect();
  try {
    // Récupère le restaurant (pour les frais de livraison et le propriétaire).
    const resResto = await client.query('SELECT * FROM restaurants WHERE id = $1', [restaurant_id]);
    if (resResto.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant introuvable.' });
    }
    const restaurant = resResto.rows[0];

    // Récupère les plats demandés en base (prix fiables côté serveur, jamais celui du client).
    const platIds = items.map((i) => i.plat_id);
    const resPlats = await client.query(
      'SELECT * FROM plats WHERE id = ANY($1) AND restaurant_id = $2',
      [platIds, restaurant_id]
    );
    const platsParId = new Map(resPlats.rows.map((p) => [p.id, p]));

    // Construit les lignes de commande et calcule le sous-total.
    let sousTotal = 0;
    const lignes = [];
    for (const item of items) {
      const plat = platsParId.get(item.plat_id);
      const quantite = Number(item.quantite) || 0;
      if (!plat) {
        return res.status(400).json({ message: `Plat introuvable (id ${item.plat_id}).` });
      }
      if (!plat.disponible) {
        return res.status(400).json({ message: `« ${plat.nom} » n'est plus disponible.` });
      }
      if (quantite <= 0) {
        return res.status(400).json({ message: 'Quantité invalide.' });
      }
      sousTotal += plat.prix * quantite;
      lignes.push({ plat_id: plat.id, nom_plat: plat.nom, prix_unitaire: plat.prix, quantite });
    }

    const fraisLivraison = restaurant.frais_livraison || 0;
    const total = sousTotal + fraisLivraison;

    // 1) Paiement mobile money (Orange / MTN).
    const paiement = await initierPaiement({ mode: mode_paiement, telephone, montant: total });
    if (paiement.statut === 'echoue') {
      return res.status(402).json({ message: 'Le paiement a échoué. Veuillez réessayer.' });
    }

    // 2) Enregistrement de la commande + lignes dans une transaction.
    await client.query('BEGIN');

    const resCmd = await client.query(
      `INSERT INTO commandes
         (client_id, restaurant_id, adresse_livraison, telephone, sous_total,
          frais_livraison, total, mode_paiement, statut_paiement, reference_paiement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.user.id, restaurant_id, adresse_livraison, telephone, sousTotal,
        fraisLivraison, total, mode_paiement, paiement.statut, paiement.reference,
      ]
    );
    const commande = resCmd.rows[0];

    for (const l of lignes) {
      await client.query(
        `INSERT INTO commande_items (commande_id, plat_id, nom_plat, prix_unitaire, quantite)
         VALUES ($1,$2,$3,$4,$5)`,
        [commande.id, l.plat_id, l.nom_plat, l.prix_unitaire, l.quantite]
      );
    }

    await client.query('COMMIT');

    // 3) Notifications (client + restaurateur). N'empêchent jamais la commande.
    await envoyerNotification({
      telephone,
      message: `EasyFood : votre commande #${commande.id} chez ${restaurant.nom} est confirmée et payée (${total} XAF). Merci !`,
    });
    const resProprio = await pool.query('SELECT telephone FROM users WHERE id = $1', [restaurant.proprietaire_id]);
    if (resProprio.rows[0]?.telephone) {
      await envoyerNotification({
        telephone: resProprio.rows[0].telephone,
        message: `EasyFood : nouvelle commande #${commande.id} (${total} XAF) à préparer pour ${restaurant.nom}.`,
      });
    }

    const complete = await commandeComplete(commande.id);
    res.status(201).json(complete);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur création commande :', err);
    res.status(500).json({ message: 'Erreur serveur lors de la commande.' });
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------
// MES COMMANDES (client) : historique
// ------------------------------------------------------------
exports.mesCommandes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, r.nom AS restaurant_nom, r.logo_url AS restaurant_logo,
              l.nom AS livreur_nom, l.telephone AS livreur_telephone,
              e.id AS evaluation_id, e.note_restaurant, e.note_livreur
       FROM commandes c
       JOIN restaurants r ON r.id = c.restaurant_id
       LEFT JOIN users l ON l.id = c.livreur_id
       LEFT JOIN evaluations e ON e.commande_id = c.id
       WHERE c.client_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    // On attache les lignes à chaque commande.
    const commandes = [];
    for (const cmd of result.rows) {
      const items = await pool.query(
        'SELECT * FROM commande_items WHERE commande_id = $1 ORDER BY id',
        [cmd.id]
      );
      commandes.push({ ...cmd, items: items.rows });
    }
    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// COMMANDES DU RESTAURATEUR (toutes celles de ses restaurants)
// ------------------------------------------------------------
exports.commandesRestaurant = async (req, res) => {
  if (req.user.role !== 'restaurateur') {
    return res.status(403).json({ message: 'Accès réservé aux restaurateurs.' });
  }
  try {
    const result = await pool.query(
      `SELECT c.*, u.nom AS client_nom, l.nom AS livreur_nom
       FROM commandes c
       JOIN restaurants r ON r.id = c.restaurant_id
       JOIN users u ON u.id = c.client_id
       LEFT JOIN users l ON l.id = c.livreur_id
       WHERE r.proprietaire_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    const commandes = [];
    for (const cmd of result.rows) {
      const items = await pool.query(
        'SELECT * FROM commande_items WHERE commande_id = $1 ORDER BY id',
        [cmd.id]
      );
      commandes.push({ ...cmd, items: items.rows });
    }
    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// DÉTAIL D'UNE COMMANDE (client propriétaire ou restaurateur propriétaire)
// ------------------------------------------------------------
exports.getOne = async (req, res) => {
  try {
    const complete = await commandeComplete(req.params.id);
    if (!complete) return res.status(404).json({ message: 'Commande introuvable.' });

    // Vérifie que l'utilisateur a le droit de voir cette commande.
    const estClient = complete.client_id === req.user.id;
    const resResto = await pool.query('SELECT proprietaire_id FROM restaurants WHERE id = $1', [complete.restaurant_id]);
    const estProprio = resResto.rows[0]?.proprietaire_id === req.user.id;
    if (!estClient && !estProprio && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Non autorisé.' });
    }
    res.json(complete);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// CHANGER LE STATUT D'UNE COMMANDE (restaurateur)
// ------------------------------------------------------------
exports.changerStatut = async (req, res) => {
  const { statut } = req.body;
  if (!STATUTS_VALIDES.includes(statut)) {
    return res.status(400).json({ message: 'Statut invalide.' });
  }
  try {
    // Vérifie que la commande appartient à un restaurant du restaurateur.
    const resCmd = await pool.query(
      `SELECT c.*, r.proprietaire_id, r.nom AS restaurant_nom
       FROM commandes c JOIN restaurants r ON r.id = c.restaurant_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (resCmd.rows.length === 0) return res.status(404).json({ message: 'Commande introuvable.' });
    const commande = resCmd.rows[0];
    if (commande.proprietaire_id !== req.user.id) {
      return res.status(403).json({ message: 'Non autorisé.' });
    }

    const result = await pool.query(
      'UPDATE commandes SET statut = $1 WHERE id = $2 RETURNING *',
      [statut, req.params.id]
    );

    // Notifie le client du changement de statut.
    await envoyerNotification({
      telephone: commande.telephone,
      message: `EasyFood : votre commande #${commande.id} est maintenant ${LIBELLES_STATUT[statut]}.`,
    });

    const complete = await commandeComplete(result.rows[0].id);
    res.json(complete);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// MISSIONS DISPONIBLES (livreur) : commandes prêtes, sans livreur
// ------------------------------------------------------------
exports.missionsDisponibles = async (req, res) => {
  if (req.user.role !== 'livreur') {
    return res.status(403).json({ message: 'Accès réservé aux livreurs.' });
  }
  try {
    const result = await pool.query(
      `SELECT c.id, c.adresse_livraison, c.telephone, c.total, c.frais_livraison,
              c.created_at, r.nom AS restaurant_nom, r.adresse AS restaurant_adresse,
              r.latitude AS restaurant_lat, r.longitude AS restaurant_lng
       FROM commandes c
       JOIN restaurants r ON r.id = c.restaurant_id
       WHERE c.statut = 'prete' AND c.livreur_id IS NULL
       ORDER BY c.created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// MES MISSIONS (livreur) : commandes que je livre (en cours + historique)
// ------------------------------------------------------------
exports.mesMissions = async (req, res) => {
  if (req.user.role !== 'livreur') {
    return res.status(403).json({ message: 'Accès réservé aux livreurs.' });
  }
  try {
    const result = await pool.query(
      `SELECT c.*, r.nom AS restaurant_nom, r.adresse AS restaurant_adresse, u.nom AS client_nom
       FROM commandes c
       JOIN restaurants r ON r.id = c.restaurant_id
       JOIN users u ON u.id = c.client_id
       WHERE c.livreur_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    const commandes = [];
    for (const cmd of result.rows) {
      const items = await pool.query(
        'SELECT * FROM commande_items WHERE commande_id = $1 ORDER BY id',
        [cmd.id]
      );
      commandes.push({ ...cmd, items: items.rows });
    }
    res.json(commandes);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// ACCEPTER UNE MISSION (livreur) : s'affecte la commande -> en_livraison
// ------------------------------------------------------------
exports.accepterMission = async (req, res) => {
  if (req.user.role !== 'livreur') {
    return res.status(403).json({ message: 'Accès réservé aux livreurs.' });
  }
  try {
    // On n'affecte que si la commande est prête ET encore libre (évite les doublons).
    const result = await pool.query(
      `UPDATE commandes
       SET livreur_id = $1, statut = 'en_livraison'
       WHERE id = $2 AND statut = 'prete' AND livreur_id IS NULL
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'Cette mission n\'est plus disponible.' });
    }
    const commande = result.rows[0];

    // Notifie le client : un livreur a pris en charge sa commande.
    await envoyerNotification({
      telephone: commande.telephone,
      message: `EasyFood : ${req.user.nom || 'un livreur'} a pris en charge votre commande #${commande.id}. Elle est en route !`,
    });

    const complete = await commandeComplete(commande.id);
    res.json(complete);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// CONFIRMER LA LIVRAISON (livreur) : en_livraison -> livree
// ------------------------------------------------------------
exports.confirmerLivraison = async (req, res) => {
  if (req.user.role !== 'livreur') {
    return res.status(403).json({ message: 'Accès réservé aux livreurs.' });
  }
  try {
    const result = await pool.query(
      `UPDATE commandes
       SET statut = 'livree'
       WHERE id = $1 AND livreur_id = $2 AND statut = 'en_livraison'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'Livraison impossible (commande introuvable ou déjà livrée).' });
    }
    const commande = result.rows[0];

    // On incrémente le compteur de courses du livreur.
    await pool.query('UPDATE users SET nb_courses = nb_courses + 1 WHERE id = $1', [req.user.id]);

    // Notifie le client que la commande est livrée et l'invite à noter.
    await envoyerNotification({
      telephone: commande.telephone,
      message: `EasyFood : votre commande #${commande.id} a été livrée. Bon appétit ! Pensez à noter le restaurant et le livreur.`,
    });

    const complete = await commandeComplete(commande.id);
    res.json(complete);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ------------------------------------------------------------
// ÉVALUER UNE COMMANDE (client) : note du restaurant + du livreur
// Recalcule les moyennes du restaurant et du livreur.
// ------------------------------------------------------------
exports.evaluer = async (req, res) => {
  const { note_restaurant, note_livreur, commentaire } = req.body;
  const noteResto = Number(note_restaurant);
  if (!Number.isInteger(noteResto) || noteResto < 1 || noteResto > 5) {
    return res.status(400).json({ message: 'La note du restaurant doit être comprise entre 1 et 5.' });
  }
  const noteLivreur = note_livreur != null && note_livreur !== '' ? Number(note_livreur) : null;
  if (noteLivreur !== null && (!Number.isInteger(noteLivreur) || noteLivreur < 1 || noteLivreur > 5)) {
    return res.status(400).json({ message: 'La note du livreur doit être comprise entre 1 et 5.' });
  }

  const client = await pool.connect();
  try {
    const resCmd = await client.query('SELECT * FROM commandes WHERE id = $1', [req.params.id]);
    if (resCmd.rows.length === 0) return res.status(404).json({ message: 'Commande introuvable.' });
    const commande = resCmd.rows[0];

    if (commande.client_id !== req.user.id) {
      return res.status(403).json({ message: 'Vous ne pouvez évaluer que vos propres commandes.' });
    }
    if (commande.statut !== 'livree') {
      return res.status(400).json({ message: 'Vous pourrez noter une fois la commande livrée.' });
    }

    const dejaNote = await client.query('SELECT id FROM evaluations WHERE commande_id = $1', [commande.id]);
    if (dejaNote.rows.length > 0) {
      return res.status(409).json({ message: 'Cette commande a déjà été évaluée.' });
    }

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO evaluations
         (commande_id, client_id, restaurant_id, livreur_id, note_restaurant, note_livreur, commentaire)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [commande.id, req.user.id, commande.restaurant_id, commande.livreur_id,
       noteResto, noteLivreur, commentaire || null]
    );

    // Recalcule la note moyenne du restaurant.
    await client.query(
      `UPDATE restaurants SET
         note = COALESCE((SELECT ROUND(AVG(note_restaurant)::numeric, 1) FROM evaluations WHERE restaurant_id = $1), 0),
         nb_evaluations = (SELECT COUNT(*) FROM evaluations WHERE restaurant_id = $1)
       WHERE id = $1`,
      [commande.restaurant_id]
    );

    // Recalcule la note moyenne du livreur (si noté).
    if (commande.livreur_id && noteLivreur !== null) {
      await client.query(
        `UPDATE users SET
           note = COALESCE((SELECT ROUND(AVG(note_livreur)::numeric, 1) FROM evaluations WHERE livreur_id = $1 AND note_livreur IS NOT NULL), 0)
         WHERE id = $1`,
        [commande.livreur_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Merci pour votre évaluation !' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Erreur évaluation :', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'évaluation.' });
  } finally {
    client.release();
  }
};
