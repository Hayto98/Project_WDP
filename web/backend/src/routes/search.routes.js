const { Router } = require('express');
const ctrl = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getSavedSearches);
router.post('/', ctrl.createSavedSearch);
router.delete('/:id', ctrl.deleteSavedSearch);

module.exports = router;
