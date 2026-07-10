const { Router } = require('express');
const ctrl = require('../controllers/feedback.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rbac } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createFeedbackSchema, updateFeedbackSchema } = require('../validators/feedback.validator');

const router = Router();
router.use(authenticate);

router.post('/', validate(createFeedbackSchema), ctrl.create);
router.get('/', ctrl.list);
router.put('/:id', rbac('Admin'), validate(updateFeedbackSchema), ctrl.update);

module.exports = router;
