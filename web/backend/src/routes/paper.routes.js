const { Router } = require('express');
const ctrl = require('../controllers/paper.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

const router = Router();

router.get('/search', authenticate, ctrl.search);
router.get('/trending', authenticate, ctrl.getTrending);
router.get('/:id', optionalAuth, ctrl.getById);

module.exports = router;
