const { Router } = require('express');
const ctrl = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/trends', ctrl.getTrends);
router.get('/trends/growth', ctrl.getGrowth);
router.get('/trends/cooccurrence', ctrl.getCooccurrence);
router.get('/gaps', ctrl.getGaps);

module.exports = router;
