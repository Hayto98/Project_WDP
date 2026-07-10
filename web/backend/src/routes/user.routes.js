const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { updateProfileSchema, updateDashboardLayoutSchema } = require('../validators/user.validator');

const router = Router();
router.use(authenticate);

router.put('/me', validate(updateProfileSchema), ctrl.updateProfile);
router.put('/me/dashboard-layout', validate(updateDashboardLayoutSchema), ctrl.updateDashboardLayout);

module.exports = router;
