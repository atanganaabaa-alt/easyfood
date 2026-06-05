const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const protect = require('../middlewares/auth.middleware');

router.post('/register', auth.register);
router.post('/login',    auth.login);
router.get('/profil',    protect, auth.profil);

module.exports = router;
