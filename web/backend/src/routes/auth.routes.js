const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

const router = Router();

// Public
router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', authLimiter, validate(refreshTokenSchema), ctrl.refresh);

// Protected
router.post('/logout', authenticate, ctrl.logout);
router.put('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword);
router.get('/me', authenticate, ctrl.getMe);
router.put('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword);

module.exports = router;
