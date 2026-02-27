const express = require('express');
const router  = express.Router();
const User    = require('../models/User.model');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.put('/profile', async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'avatar'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
