const { Router } = require('express');
const ctrl = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createSavedSearchSchema } = require('../validators/search.validator');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.getSavedSearches);
router.post('/', validate(createSavedSearchSchema), ctrl.createSavedSearch);
router.delete('/:id', ctrl.deleteSavedSearch);

module.exports = router;
