const { Router } = require('express');
const ctrl = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

router.post('/summarize', ctrl.summarize);
router.post('/explain-term', ctrl.explainTerm);
router.post('/suggest-directions', ctrl.suggestDirections);
router.get('/insights', ctrl.getInsights);

module.exports = router;
