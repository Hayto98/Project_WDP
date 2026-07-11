const { Router } = require('express');
const ctrl = require('../controllers/feedback.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rbac } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createFeedbackSchema, updateFeedbackSchema } = require('../validators/feedback.validator');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Feedbacks
 *   description: System feedback and error reporting
 */

/**
 * @swagger
 * /api/v1/feedbacks:
 *   post:
 *     summary: Submit feedback
 *     tags: [Feedbacks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Feedback submitted
 */
router.post('/', validate(createFeedbackSchema), ctrl.create);

/**
 * @swagger
 * /api/v1/feedbacks:
 *   get:
 *     summary: List feedback (Admin)
 *     tags: [Feedbacks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of feedbacks
 */
router.get('/', ctrl.list);

/**
 * @swagger
 * /api/v1/feedbacks/{id}:
 *   put:
 *     summary: Update feedback status (Admin)
 *     tags: [Feedbacks]
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
 *         description: Feedback updated
 */
router.put('/:id', rbac('Admin'), validate(updateFeedbackSchema), ctrl.update);

module.exports = router;
