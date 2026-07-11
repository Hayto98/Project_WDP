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

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered features
 */

/**
 * @swagger
 * /api/v1/ai/summarize:
 *   post:
 *     summary: Summarize a paper
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Summary generated
 */
router.post('/summarize', validate(summarizeSchema), ctrl.summarize);

/**
 * @swagger
 * /api/v1/ai/explain-term:
 *   post:
 *     summary: Explain a technical term
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Term explained
 */
router.post('/explain-term', validate(explainTermSchema), ctrl.explainTerm);

/**
 * @swagger
 * /api/v1/ai/suggest-directions:
 *   post:
 *     summary: Suggest research directions
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Directions suggested
 */
router.post('/suggest-directions', validate(suggestDirectionsSchema), ctrl.suggestDirections);

/**
 * @swagger
 * /api/v1/ai/related-papers:
 *   post:
 *     summary: Find related papers
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Related papers found
 */
router.post('/related-papers', validate(relatedPapersSchema), ctrl.relatedPapers);

/**
 * @swagger
 * /api/v1/ai/insights:
 *   get:
 *     summary: Get AI insights
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Insights retrieved
 */
router.get('/insights', ctrl.getInsights);

module.exports = router;
