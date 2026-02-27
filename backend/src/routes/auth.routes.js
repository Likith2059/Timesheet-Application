const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', [body('firstName').notEmpty(), body('lastName').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })], ctrl.register);
router.post('/login',    [body('email').isEmail(), body('password').notEmpty()], ctrl.login);
router.get('/me',        protect, ctrl.getMe);
router.put('/change-password', protect, ctrl.changePassword);

module.exports = router;
