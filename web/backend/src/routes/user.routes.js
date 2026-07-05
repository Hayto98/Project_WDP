const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

router.put('/me', ctrl.updateProfile);
router.put('/me/dashboard-layout', ctrl.updateDashboardLayout);

module.exports = router;
