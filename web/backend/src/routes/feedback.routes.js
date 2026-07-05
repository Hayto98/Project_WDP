const { Router } = require('express');
const ctrl = require('../controllers/feedback.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { rbac } = require('../middleware/rbac.middleware');

const router = Router();
router.use(authenticate);

router.post('/', ctrl.create);
router.get('/', ctrl.list);
router.put('/:id', rbac('Admin'), ctrl.update);

module.exports = router;
