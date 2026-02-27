const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/leave.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/apply',             ctrl.applyLeave);
router.get('/my',                 ctrl.getMyLeaves);
router.get('/all',                authorize('admin', 'manager'), ctrl.getAllLeaves);
router.put('/:id/review',         authorize('admin', 'manager'), ctrl.reviewLeave);
router.patch('/:id/cancel',       ctrl.cancelLeave);

module.exports = router;
