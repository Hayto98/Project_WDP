const { Router } = require('express');
const ctrl = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notifications
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', ctrl.getNotifications);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', ctrl.getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.put('/read-all', ctrl.markAllRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   put:
 *     summary: Mark a specific notification as read
 *     tags: [Notifications]
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
 *         description: Marked as read
 */
router.put('/:id/read', ctrl.markRead);

module.exports = router;
