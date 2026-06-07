const router = require('express').Router();
const protect = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/admin.middleware');
const c = require('../controllers/admin.controller');

// Toutes les routes admin nécessitent JWT + rôle admin.
router.use(protect, adminOnly);

router.get('/stats', c.stats);
router.get('/utilisateurs', c.listeUtilisateurs);
router.put('/utilisateurs/:id/statut', c.modifierStatut);
router.put('/utilisateurs/:id/valider', c.validerRestaurateur);
router.delete('/utilisateurs/:id', c.supprimerUtilisateur);
router.get('/commission', c.getCommission);
router.put('/commission', c.setCommission);
router.get('/categories', c.categories);

module.exports = router;
