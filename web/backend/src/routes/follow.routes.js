const { Router } = require('express');
const ctrl = require('../controllers/follow.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

// Subjects
router.get('/subjects', ctrl.getSubjects);
router.post('/subjects', ctrl.addSubject);
router.put('/subjects/:id', ctrl.updateSubject);
router.delete('/subjects/:id', ctrl.removeSubject);

// Alerts
router.get('/alerts', ctrl.getAlerts);
router.put('/alerts/:id/read', ctrl.markAlertRead);
router.put('/alerts/read-all', ctrl.markAllRead);

module.exports = router;
