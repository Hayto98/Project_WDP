const { Router } = require('express');
const ctrl = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard overview and statistics
 */

/**
 * @swagger
 * /api/v1/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
 */
router.get('/overview', ctrl.getOverview);

module.exports = router;
