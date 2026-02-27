const moment = require('moment');
const Timesheet = require('../models/Timesheet.model');
const User = require('../models/User.model');

// ── Helper ──────────────────────────────────────────────────────
const getTodayDate = () => moment().format('YYYY-MM-DD');

// POST /api/timesheet/clock-in
exports.clockIn = async (req, res) => {
  try {
    const today = getTodayDate();
    const existing = await Timesheet.findOne({ employee: req.user._id, date: today });

    if (existing && existing.clockIn) {
      return res.status(400).json({ error: 'Already clocked in today.' });
    }

    const user = await User.findById(req.user._id);
    const now  = moment();
    const scheduledStart = moment(`${today} ${user.workSchedule.startTime}`, 'YYYY-MM-DD HH:mm');
    const lateThreshold  = scheduledStart.clone().add(10, 'minutes');
    const isLate         = now.isAfter(lateThreshold);
    const lateByMinutes  = isLate ? now.diff(scheduledStart, 'minutes') : 0;

    const record = existing
      ? await Timesheet.findByIdAndUpdate(existing._id, {
          clockIn: now.toDate(),
          status: isLate ? 'late' : 'present',
          isLate,
          lateByMinutes,
          ipAddress: req.ip,
          ...(req.body.location && { 'location.clockInLocation': req.body.location })
        }, { new: true })
      : await Timesheet.create({
          employee: req.user._id,
          date: today,
          clockIn: now.toDate(),
          status: isLate ? 'late' : 'present',
          isLate,
          lateByMinutes,
          ipAddress: req.ip,
          ...(req.body.location && { 'location.clockInLocation': req.body.location })
        });

    res.status(201).json({
      message: isLate
        ? `Clocked in (${lateByMinutes} minutes late)`
        : 'Clocked in successfully',
      record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/timesheet/clock-out
exports.clockOut = async (req, res) => {
  try {
    const today  = getTodayDate();
    const record = await Timesheet.findOne({ employee: req.user._id, date: today });

    if (!record || !record.clockIn) {
      return res.status(400).json({ error: 'You have not clocked in today.' });
    }
    if (record.clockOut) {
      return res.status(400).json({ error: 'Already clocked out today.' });
    }
    if (record.isOnBreak) {
      return res.status(400).json({ error: 'Please end your break before clocking out.' });
    }

    record.clockOut = new Date();
    if (req.body.location) record.location.clockOutLocation = req.body.location;
    if (req.body.notes)    record.notes = req.body.notes;

    await record.save(); // triggers pre-save to compute totals

    res.json({
      message: 'Clocked out successfully',
      summary: {
        clockIn:        moment(record.clockIn).format('hh:mm A'),
        clockOut:       moment(record.clockOut).format('hh:mm A'),
        totalWorkHours: record.totalWorkHours,
        overtimeMinutes: record.overtimeMinutes
      },
      record
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/timesheet/break-start
exports.startBreak = async (req, res) => {
  try {
    const today  = getTodayDate();
    const record = await Timesheet.findOne({ employee: req.user._id, date: today });

    if (!record || !record.clockIn || record.clockOut) {
      return res.status(400).json({ error: 'No active session to start a break.' });
    }
    if (record.isOnBreak) {
      return res.status(400).json({ error: 'Already on break.' });
    }

    record.breaks.push({ breakStart: new Date() });
    record.isOnBreak = true;
    await record.save();

    res.json({ message: 'Break started', record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/timesheet/break-end
exports.endBreak = async (req, res) => {
  try {
    const today  = getTodayDate();
    const record = await Timesheet.findOne({ employee: req.user._id, date: today });

    if (!record || !record.isOnBreak) {
      return res.status(400).json({ error: 'Not currently on break.' });
    }

    const lastBreak = record.breaks[record.breaks.length - 1];
    lastBreak.breakEnd  = new Date();
    lastBreak.duration  = Math.floor((lastBreak.breakEnd - lastBreak.breakStart) / 60000);
    record.isOnBreak    = false;

    await record.save();

    res.json({ message: `Break ended (${lastBreak.duration} minutes)`, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/timesheet/today
exports.getToday = async (req, res) => {
  try {
    const today  = getTodayDate();
    const record = await Timesheet.findOne({ employee: req.user._id, date: today });
    res.json({ date: today, record: record || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/timesheet/my?month=2024-01
exports.getMyTimesheets = async (req, res) => {
  try {
    const { month, startDate, endDate, page = 1, limit = 31 } = req.query;
    const filter = { employee: req.user._id };

    if (month) {
      const start = moment(month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
      const end   = moment(month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');
      filter.date = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const records = await Timesheet.find(filter)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('approvedBy', 'fullName');

    const total = await Timesheet.countDocuments(filter);

    // Summary stats
    const stats = records.reduce((acc, r) => {
      acc.totalWorkHours   += r.totalWorkHours || 0;
      acc.overtimeMinutes  += r.overtimeMinutes || 0;
      if (r.status === 'present' || r.status === 'late') acc.presentDays++;
      if (r.status === 'absent')   acc.absentDays++;
      if (r.status === 'on-leave') acc.leaveDays++;
      if (r.isLate) acc.lateDays++;
      return acc;
    }, { totalWorkHours: 0, overtimeMinutes: 0, presentDays: 0, absentDays: 0, leaveDays: 0, lateDays: 0 });

    res.json({ records, total, page: +page, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/timesheet/all  (admin/manager)
exports.getAllTimesheets = async (req, res) => {
  try {
    const { date, month, employeeId, department, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (date)   filter.date = date;
    if (status) filter.status = status;
    if (month) {
      const start = moment(month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
      const end   = moment(month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');
      filter.date = { $gte: start, $lte: end };
    }
    if (employeeId) {
      const user = await User.findOne({ employeeId });
      if (user) filter.employee = user._id;
    }
    if (department) {
      const users = await User.find({ department }).select('_id');
      filter.employee = { $in: users.map(u => u._id) };
    }

    const records = await Timesheet.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('employee', 'firstName lastName employeeId department designation avatar');

    const total = await Timesheet.countDocuments(filter);

    res.json({ records, total, page: +page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/timesheet/:id/approve  (admin/manager)
exports.approveTimesheet = async (req, res) => {
  try {
    const record = await Timesheet.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, approvedBy: req.user._id },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json({ message: 'Timesheet approved', record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
