const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('admin'));
router.get('/employees',                     ctrl.getEmployees);
router.get('/employees/:id',                 ctrl.getEmployee);
router.put('/employees/:id',                 ctrl.updateEmployee);
router.delete('/employees/:id',              ctrl.deactivateEmployee);
router.post('/employees/:id/reset-password', ctrl.resetPassword);
router.get('/departments',                   ctrl.getDepartments);

module.exports = router;
