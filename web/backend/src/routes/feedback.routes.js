const { Router } = require('express');
const ctrl = require('../controllers/feedback.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rbac } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  createFeedbackSchema,
  updateFeedbackSchema,
  replyFeedbackSchema,
} = require('../validators/feedback.validator');

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Feedbacks
 *   description: System feedback chat between users and admins
 */

router.post('/', validate(createFeedbackSchema), ctrl.create);
router.get('/', ctrl.list);
router.get('/pending-count', rbac('Admin'), ctrl.pendingCount);
router.get('/:id', ctrl.getById);
router.put('/:id', rbac('Admin'), validate(updateFeedbackSchema), ctrl.update);
router.post('/:id/messages', validate(replyFeedbackSchema), ctrl.reply);

module.exports = router;
