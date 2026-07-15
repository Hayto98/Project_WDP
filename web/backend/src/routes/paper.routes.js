const { Router } = require('express');
const ctrl = require('../controllers/paper.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { syncRequestSchema } = require('../validators/paper.validator');

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Papers
 *   description: Paper and research endpoints
 */

/**
 * @swagger
 * /api/v1/papers/search:
 *   get:
 *     summary: Search for papers
 *     tags: [Papers]
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', optionalAuth, ctrl.search);

/**
 * @swagger
 * /api/v1/papers/trending:
 *   get:
 *     summary: Get trending papers
 *     tags: [Papers]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Trending papers
 */
router.get('/trending', authenticate, ctrl.getTrending);

/**
 * @swagger
 * /api/v1/papers/sync-request:
 *   post:
 *     summary: Request corpus synchronization
 *     tags: [Papers]
 *     responses:
 *       200:
 *         description: Sync requested
 */
router.post('/sync-request', optionalAuth, validate(syncRequestSchema), ctrl.requestCorpusSync);

/**
 * Start and update a dwell-time session on the in-app paper detail page.
 */
router.post('/:id/view-session', authenticate, ctrl.startReadingSession);
router.patch('/:id/view-session/:viewId', authenticate, ctrl.updateReadingSession);

/**
 * @swagger
 * /api/v1/papers/{id}:
 *   get:
 *     summary: Get paper details by ID
 *     tags: [Papers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paper details
 */
router.get('/:id', optionalAuth, ctrl.getById);

module.exports = router;
