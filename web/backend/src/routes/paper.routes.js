const { Router } = require('express');
const ctrl = require('../controllers/paper.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { syncRequestSchema } = require('../validators/paper.validator');

const router = Router();

router.get('/search', optionalAuth, ctrl.search);
router.get('/trending', authenticate, ctrl.getTrending);
router.post('/sync-request', optionalAuth, validate(syncRequestSchema), ctrl.requestCorpusSync);
router.get('/:id', optionalAuth, ctrl.getById);

module.exports = router;
