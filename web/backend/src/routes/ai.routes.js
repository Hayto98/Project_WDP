const { Router } = require('express');
const ctrl = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { aiLimiter } = require('../middleware/rateLimiter.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  summarizeSchema,
  explainTermSchema,
  suggestDirectionsSchema,
  relatedPapersSchema,
} = require('../validators/ai.validator');

const router = Router();
router.use(authenticate);
router.use(aiLimiter);

router.post('/summarize', validate(summarizeSchema), ctrl.summarize);
router.post('/explain-term', validate(explainTermSchema), ctrl.explainTerm);
router.post('/suggest-directions', validate(suggestDirectionsSchema), ctrl.suggestDirections);
router.post('/related-papers', validate(relatedPapersSchema), ctrl.relatedPapers);
router.get('/insights', ctrl.getInsights);

module.exports = router;
