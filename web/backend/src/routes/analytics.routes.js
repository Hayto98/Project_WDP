const { Router } = require('express');
const ctrl = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { gapsQuerySchema, liveGapSchema, saveLiveGapSchema } = require('../validators/analytics.validator');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics and trends data
 */

/**
 * @swagger
 * /api/v1/analytics/trends:
 *   get:
 *     summary: Get overall trends
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Trends data
 */
router.get('/trends', ctrl.getTrends);

/**
 * @swagger
 * /api/v1/analytics/trends/growth:
 *   get:
 *     summary: Get trend growth
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Growth data
 */
router.get('/trends/growth', ctrl.getGrowth);

/**
 * @swagger
 * /api/v1/analytics/trends/cooccurrence:
 *   get:
 *     summary: Get keyword co-occurrence
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Co-occurrence data
 */
router.get('/trends/cooccurrence', ctrl.getCooccurrence);

/**
 * @swagger
 * /api/v1/analytics/gaps:
 *   get:
 *     summary: Get research gaps
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Research gaps data
 */
router.get('/gaps', validate(gapsQuerySchema, 'query'), ctrl.getGaps);

/**
 * @swagger
 * /api/v1/analytics/gaps/live:
 *   post:
 *     summary: Analyze research gaps from live external sources
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Live research gaps
 */
router.post('/gaps/live', validate(liveGapSchema), ctrl.getLiveGaps);
router.post('/gaps/live/save', validate(saveLiveGapSchema), ctrl.saveLiveGaps);

module.exports = router;
