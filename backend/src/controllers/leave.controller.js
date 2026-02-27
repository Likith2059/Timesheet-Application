const moment = require('moment');
const Leave = require('../models/Leave.model');
const User  = require('../models/User.model');

// POST /api/leaves/apply
exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, isHalfDay, halfDayType } = req.body;

    const start = moment(startDate);
    const end   = moment(endDate);

    if (end.isBefore(start)) {
      return res.status(400).json({ error: 'End date must be after start date.' });
    }

    // Count working days (exclude weekends)
    let totalDays = 0;
    const cur = start.clone();
    while (cur.isSameOrBefore(end, 'day')) {
      if (cur.day() !== 0 && cur.day() !== 6) totalDays++;
      cur.add(1, 'day');
    }
    if (isHalfDay) totalDays = 0.5;

    // Check balance (exclude unpaid)
    const user = await User.findById(req.user._id);
    if (leaveType !== 'unpaid' && leaveType !== 'maternity' && leaveType !== 'paternity' && leaveType !== 'bereavement') {
      if ((user.leaveBalance[leaveType] || 0) < totalDays) {
        return res.status(400).json({
          error: `Insufficient ${leaveType} leave balance. Available: ${user.leaveBalance[leaveType] || 0} days.`
        });
      }
    }

    const leave = await Leave.create({
      employee: req.user._id,
      leaveType,
      startDate: start.toDate(),
      endDate:   end.toDate(),
      totalDays,
      isHalfDay: !!isHalfDay,
      halfDayType,
      reason
    });

    await leave.populate('employee', 'firstName lastName employeeId department');

    res.status(201).json({ message: 'Leave application submitted successfully', leave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/leaves/my
exports.getMyLeaves = async (req, res) => {
  try {
    const { status, year } = req.query;
    const filter = { employee: req.user._id };
    if (status) filter.status = status;
    if (year) {
      filter.startDate = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      };
    }

    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .populate('reviewedBy', 'fullName');

    const user = await User.findById(req.user._id).select('leaveBalance');

    res.json({ leaves, leaveBalance: user.leaveBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/leaves/all  (admin/manager)
exports.getAllLeaves = async (req, res) => {
  try {
    const { status, department, leaveType, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)    filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    if (department) {
      const users = await User.find({ department }).select('_id');
      filter.employee = { $in: users.map(u => u._id) };
    }

    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('employee', 'firstName lastName employeeId department avatar')
      .populate('reviewedBy', 'fullName');

    const total = await Leave.countDocuments(filter);

    res.json({ leaves, total, page: +page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/leaves/:id/review  (admin/manager)
exports.reviewLeave = async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected.' });
    }

    const leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) return res.status(404).json({ error: 'Leave not found.' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: 'Leave already reviewed.' });
    }

    leave.status     = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewNote = reviewNote;
    await leave.save();

    // Update balance if approved
    if (status === 'approved') {
      const balanceKey = leave.leaveType;
      const validKeys  = ['annual', 'sick', 'casual', 'unpaid'];
      if (validKeys.includes(balanceKey)) {
        await User.findByIdAndUpdate(leave.employee._id, {
          $inc: { [`leaveBalance.${balanceKey}`]: -leave.totalDays }
        });
      }
    }

    res.json({ message: `Leave ${status} successfully`, leave });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/leaves/:id  (cancel by employee)
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findOne({ _id: req.params.id, employee: req.user._id });
    if (!leave) return res.status(404).json({ error: 'Leave not found.' });
    if (leave.status === 'approved') {
      return res.status(400).json({ error: 'Cannot cancel an approved leave. Contact admin.' });
    }
    leave.status = 'cancelled';
    await leave.save();
    res.json({ message: 'Leave cancelled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
