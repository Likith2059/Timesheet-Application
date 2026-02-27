const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin','manager'));
router.get('/attendance', ctrl.attendanceReport);
router.get('/summary',    ctrl.dashboardSummary);

module.exports = router;
