const User = require('../models/User.model');

exports.getEmployees = async (req, res) => {
  try {
    const { department, role, isActive = true, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: isActive === 'false' ? false : true };
    if (department) filter.department = department;
    if (role)       filter.role = role;
    if (search) filter.$or = [
      { firstName:  { $regex: search, $options: 'i' } },
      { lastName:   { $regex: search, $options: 'i' } },
      { email:      { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
    const employees = await User.find(filter).sort({ createdAt: -1 }).limit(limit*1).skip((page-1)*limit).select('-password');
    const total     = await User.countDocuments(filter);
    res.json({ employees, total, page: +page });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getEmployee = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ employee: user });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateEmployee = async (req, res) => {
  try {
    const allowed = ['firstName','lastName','phone','department','designation','role','isActive','workSchedule','leaveBalance'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ message: 'Employee updated', employee: user });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deactivateEmployee = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ message: 'Employee deactivated.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDepartments = async (req, res) => {
  try {
    const departments = await User.distinct('department', { isActive: true });
    res.json({ departments });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Employee not found.' });
    user.password = req.body.newPassword;
    await user.save();
    res.json({ message: 'Password reset successfully.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
