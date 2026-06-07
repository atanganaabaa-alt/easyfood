const router = require('express').Router();
const protect = require('../middlewares/auth.middleware');
const c = require('../controllers/equipe.controller');

// Gestion de l'équipe de livreurs (restaurateur connecté).
router.get('/livreurs',        protect, c.mesLivreurs);
router.post('/livreurs',       protect, c.ajouterLivreur);
router.delete('/livreurs/:id', protect, c.retirerLivreur);

module.exports = router;
