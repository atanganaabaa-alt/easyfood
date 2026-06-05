const router = require('express').Router();
const r = require('../controllers/restaurant.controller');
const protect = require('../middlewares/auth.middleware');

router.get('/',          r.getAll);
router.get('/:id',       r.getOne);
router.post('/',         protect, r.create);
router.put('/:id',       protect, r.update);
router.delete('/:id',    protect, r.remove);

module.exports = router;
