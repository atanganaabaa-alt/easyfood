const router = require('express').Router();
const p = require('../controllers/plat.controller');
const protect = require('../middlewares/auth.middleware');

router.get('/restaurant/:restaurantId',  p.getByRestaurant);
router.post('/',                         protect, p.create);
router.put('/:id',                       protect, p.update);
router.delete('/:id',                    protect, p.remove);

module.exports = router;
