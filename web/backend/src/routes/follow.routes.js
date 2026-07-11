const { Router } = require('express');
const ctrl = require('../controllers/follow.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { addSubjectSchema, updateSubjectSchema } = require('../validators/follow.validator');

const router = Router();
router.use(authenticate);

// Subjects
router.get('/subjects', ctrl.getSubjects);
router.post('/subjects', validate(addSubjectSchema), ctrl.addSubject);
router.put('/subjects/:id', validate(updateSubjectSchema), ctrl.updateSubject);
router.delete('/subjects/:id', ctrl.removeSubject);

// Alerts
router.get('/alerts', ctrl.getAlerts);
router.put('/alerts/read-all', ctrl.markAllRead);
router.put('/alerts/:id/read', ctrl.markAlertRead);

module.exports = router;
