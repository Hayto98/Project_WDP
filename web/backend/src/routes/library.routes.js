const { Router } = require('express');
const ctrl = require('../controllers/library.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createCollectionSchema,
  updateCollectionSchema,
  savePaperSchema,
  updateSavedPaperSchema,
} = require('../validators/library.validator');

const router = Router();

// All routes require auth
router.use(authenticate);

// Collections
router.get('/collections', ctrl.getCollections);
router.post('/collections', validate(createCollectionSchema), ctrl.createCollection);
router.put('/collections/:id', validate(updateCollectionSchema), ctrl.updateCollection);
router.delete('/collections/:id', ctrl.deleteCollection);

// Saved papers
router.get('/papers', ctrl.getPapers);
router.post('/papers', validate(savePaperSchema), ctrl.savePaper);
router.put('/papers/:collectionId/:paperId', validate(updateSavedPaperSchema), ctrl.updatePaper);
router.delete('/papers/:collectionId/:paperId', ctrl.removePaper);

module.exports = router;
