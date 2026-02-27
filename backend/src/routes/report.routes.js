const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/report.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/attendance',        authorize('admin', 'manager'), ctrl.attendanceReport);
router.get('/summary',           authorize('admin', 'manager'), ctrl.dashboardSummary);

module.exports = router;
