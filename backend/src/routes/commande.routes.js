const router = require('express').Router();
const c = require('../controllers/commande.controller');
const protect = require('../middlewares/auth.middleware');

// Toutes les routes de commande nécessitent d'être connecté.
router.post('/',              protect, c.create);                 // passer une commande (client)
router.get('/mes',            protect, c.mesCommandes);           // historique du client
router.get('/restaurant',     protect, c.commandesRestaurant);    // commandes reçues (restaurateur)
router.get('/missions',       protect, c.missionsDisponibles);    // missions dispo (livreur)
router.get('/mes-missions',   protect, c.mesMissions);            // mes livraisons (livreur)
router.get('/:id',            protect, c.getOne);                 // détail d'une commande
router.put('/:id/statut',     protect, c.changerStatut);          // changer le statut (restaurateur)
router.put('/:id/accepter',   protect, c.accepterMission);        // accepter une mission (livreur)
router.put('/:id/position',   protect, c.majPosition);            // position GPS du livreur (livreur)
router.put('/:id/livrer',     protect, c.confirmerLivraison);     // confirmer la livraison (livreur)
router.post('/:id/evaluation', protect, c.evaluer);               // noter resto + livreur (client)

module.exports = router;
