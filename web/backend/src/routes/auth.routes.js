const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

const router = Router();

// Public
router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);

// Protected
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.getMe);

module.exports = router;
