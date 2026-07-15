const { Router } = require('express');
const ctrl = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { gapsQuerySchema, liveGapSchema, saveLiveGapSchema, liveTrendSchema, saveLiveTrendSchema } = require('../validators/analytics.validator');

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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 example: "federated learning medical imaging"
 *               sources:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["OpenAlex", "Crossref", "arXiv"]
 *               yearFrom:
 *                 type: number
 *                 example: 2021
 *               yearTo:
 *                 type: number
 *                 example: 2026
 *               maxRecordsPerSource:
 *                 type: number
 *                 example: 30
 *     responses:
 *       200:
 *         description: Live research gaps
 */
router.post('/gaps/live', validate(liveGapSchema), ctrl.getLiveGaps);

/**
 * @swagger
 * /api/v1/analytics/gaps/live/save:
 *   post:
 *     summary: Save live research gap analysis report
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - result
 *             properties:
 *               result:
 *                 type: object
 *                 description: The result object from the live gaps analysis
 *     responses:
 *       201:
 *         description: Live gaps analysis saved successfully
 */
router.post('/gaps/live/save', validate(saveLiveGapSchema), ctrl.saveLiveGaps);

/**
 * @swagger
 * /api/v1/analytics/trends/live:
 *   post:
 *     summary: Analyze trends from live external sources
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 example: "large language model"
 *               sources:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["OpenAlex", "Crossref", "arXiv"]
 *               yearFrom:
 *                 type: number
 *                 example: 2021
 *               yearTo:
 *                 type: number
 *                 example: 2026
 *               maxRecordsPerSource:
 *                 type: number
 *                 example: 30
 *     responses:
 *       200:
 *         description: Live trends points grouped by year
 */
router.post('/trends/live', validate(liveTrendSchema), ctrl.getLiveTrends);

/**
 * @swagger
 * /api/v1/analytics/trends/live/save:
 *   post:
 *     summary: Save live trends analysis report
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - result
 *             properties:
 *               result:
 *                 type: object
 *                 description: The result object from the live trends analysis
 *     responses:
 *       201:
 *         description: Live trends analysis saved successfully
 */
router.post('/trends/live/save', validate(saveLiveTrendSchema), ctrl.saveLiveTrends);

/**
 * @swagger
 * /api/v1/analytics/trends/live/saved:
 *   get:
 *     summary: Get saved live trends analysis reports
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved live trends reports
 */
router.get('/trends/live/saved', ctrl.getSavedLiveTrends);

module.exports = router;
