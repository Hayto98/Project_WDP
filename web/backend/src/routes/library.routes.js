const { Router } = require('express');
const ctrl = require('../controllers/library.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// All routes require auth
router.use(authenticate);

// Collections
router.get('/collections', ctrl.getCollections);
router.post('/collections', ctrl.createCollection);
router.put('/collections/:id', ctrl.updateCollection);
router.delete('/collections/:id', ctrl.deleteCollection);

// Saved papers
router.get('/papers', ctrl.getPapers);
router.post('/papers', ctrl.savePaper);
router.put('/papers/:collectionId/:paperId', ctrl.updatePaper);
router.delete('/papers/:collectionId/:paperId', ctrl.removePaper);

module.exports = router;
