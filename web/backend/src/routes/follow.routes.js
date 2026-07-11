const { Router } = require('express');
const ctrl = require('../controllers/follow.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { addSubjectSchema, updateSubjectSchema } = require('../validators/follow.validator');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Follow
 *   description: Following authors/venues and alerts
 */

/**
 * @swagger
 * /api/v1/follow/subjects:
 *   get:
 *     summary: Get followed subjects
 *     tags: [Follow]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of followed subjects
 */
router.get('/subjects', ctrl.getSubjects);

/**
 * @swagger
 * /api/v1/follow/subjects:
 *   post:
 *     summary: Follow a new subject
 *     tags: [Follow]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Subject followed
 */
router.post('/subjects', validate(addSubjectSchema), ctrl.addSubject);

/**
 * @swagger
 * /api/v1/follow/subjects/{id}:
 *   put:
 *     summary: Update a followed subject
 *     tags: [Follow]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subject updated
 */
router.put('/subjects/:id', validate(updateSubjectSchema), ctrl.updateSubject);

/**
 * @swagger
 * /api/v1/follow/subjects/{id}:
 *   delete:
 *     summary: Unfollow a subject
 *     tags: [Follow]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subject unfollowed
 */
router.delete('/subjects/:id', ctrl.removeSubject);

// Alerts

/**
 * @swagger
 * /api/v1/follow/alerts:
 *   get:
 *     summary: Get alerts
 *     tags: [Follow]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of alerts
 */
router.get('/alerts', ctrl.getAlerts);

/**
 * @swagger
 * /api/v1/follow/alerts/read-all:
 *   put:
 *     summary: Mark all alerts as read
 *     tags: [Follow]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All alerts marked as read
 */
router.put('/alerts/read-all', ctrl.markAllRead);

/**
 * @swagger
 * /api/v1/follow/alerts/{id}/read:
 *   put:
 *     summary: Mark a specific alert as read
 *     tags: [Follow]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert marked as read
 */
router.put('/alerts/:id/read', ctrl.markAlertRead);

module.exports = router;
