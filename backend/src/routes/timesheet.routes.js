const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/timesheet.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/clock-in',    ctrl.clockIn);
router.post('/clock-out',   ctrl.clockOut);
router.post('/break-start', ctrl.startBreak);
router.post('/break-end',   ctrl.endBreak);
router.get('/today',        ctrl.getToday);
router.get('/my',           ctrl.getMyTimesheets);
router.get('/all',          authorize('admin','manager'), ctrl.getAllTimesheets);
router.put('/:id/approve',  authorize('admin','manager'), ctrl.approveTimesheet);

module.exports = router;
