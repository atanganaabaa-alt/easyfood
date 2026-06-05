const pool = require('../config/db');
const { initierPaiement } = require('../services/paiement.service');
const { envoyerNotification } = require('../services/notification.service');

// Statuts de commande autorisés pour une mise à jour par le restaurateur.
const STATUTS_VALIDES = ['acceptee', 'en_preparation', 'prete', 'livree', 'annulee'];

// Libellés lisibles pour les notifications.
const LIBELLES_STATUT = {
  acceptee: 'acceptée',
  en_preparation: 'en préparation',
  prete: 'prête',
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
      `SELECT c.*, r.nom AS restaurant_nom, r.logo_url AS restaurant_logo
       FROM commandes c
       JOIN restaurants r ON r.id = c.restaurant_id
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
      `SELECT c.*, u.nom AS client_nom
       FROM commandes c
       JOIN restaurants r ON r.id = c.restaurant_id
       JOIN users u ON u.id = c.client_id
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
