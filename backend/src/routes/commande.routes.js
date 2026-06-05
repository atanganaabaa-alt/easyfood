const router = require('express').Router();
const c = require('../controllers/commande.controller');
const protect = require('../middlewares/auth.middleware');

// Toutes les routes de commande nécessitent d'être connecté.
router.post('/',              protect, c.create);                 // passer une commande (client)
router.get('/mes',            protect, c.mesCommandes);           // historique du client
router.get('/restaurant',     protect, c.commandesRestaurant);    // commandes reçues (restaurateur)
router.get('/:id',            protect, c.getOne);                 // détail d'une commande
router.put('/:id/statut',     protect, c.changerStatut);          // changer le statut (restaurateur)

module.exports = router;
