const moment    = require('moment');
const Timesheet = require('../models/Timesheet.model');
const User      = require('../models/User.model');

const today = () => moment().format('YYYY-MM-DD');

exports.clockIn = async (req, res) => {
  try {
    const date     = today();
    const existing = await Timesheet.findOne({ employee: req.user._id, date });
    if (existing?.clockIn) return res.status(400).json({ error: 'Already clocked in today.' });

    const user           = await User.findById(req.user._id);
    const now            = moment();
    const scheduledStart = moment(`${date} ${user.workSchedule.startTime}`, 'YYYY-MM-DD HH:mm');
    const isLate         = now.isAfter(scheduledStart.clone().add(10, 'minutes'));
    const lateByMinutes  = isLate ? now.diff(scheduledStart, 'minutes') : 0;

    const data = { clockIn: now.toDate(), status: isLate ? 'late' : 'present', isLate, lateByMinutes, ipAddress: req.ip };

    const record = existing
      ? await Timesheet.findByIdAndUpdate(existing._id, data, { new: true })
      : await Timesheet.create({ employee: req.user._id, date, ...data });

    res.status(201).json({ message: isLate ? `Clocked in (${lateByMinutes} minutes late)` : 'Clocked in successfully', record });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.clockOut = async (req, res) => {
  try {
    const record = await Timesheet.findOne({ employee: req.user._id, date: today() });
    if (!record?.clockIn)  return res.status(400).json({ error: 'You have not clocked in today.' });
    if (record.clockOut)   return res.status(400).json({ error: 'Already clocked out today.' });
    if (record.isOnBreak)  return res.status(400).json({ error: 'Please end your break before clocking out.' });

    record.clockOut = new Date();
    if (req.body.notes) record.notes = req.body.notes;
    await record.save();

    res.json({ message: 'Clocked out successfully', summary: { clockIn: moment(record.clockIn).format('hh:mm A'), clockOut: moment(record.clockOut).format('hh:mm A'), totalWorkHours: record.totalWorkHours, overtimeMinutes: record.overtimeMinutes }, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.startBreak = async (req, res) => {
  try {
    const record = await Timesheet.findOne({ employee: req.user._id, date: today() });
    if (!record?.clockIn || record.clockOut) return res.status(400).json({ error: 'No active session.' });
    if (record.isOnBreak) return res.status(400).json({ error: 'Already on break.' });

    record.breaks.push({ breakStart: new Date() });
    record.isOnBreak = true;
    await record.save();
    res.json({ message: 'Break started', record });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.endBreak = async (req, res) => {
  try {
    const record = await Timesheet.findOne({ employee: req.user._id, date: today() });
    if (!record?.isOnBreak) return res.status(400).json({ error: 'Not on break.' });

    const lastBreak      = record.breaks[record.breaks.length - 1];
    lastBreak.breakEnd   = new Date();
    lastBreak.duration   = Math.floor((lastBreak.breakEnd - lastBreak.breakStart) / 60000);
    record.isOnBreak     = false;
    await record.save();
    res.json({ message: `Break ended (${lastBreak.duration} minutes)`, record });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getToday = async (req, res) => {
  try {
    const record = await Timesheet.findOne({ employee: req.user._id, date: today() });
    res.json({ date: today(), record: record || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getMyTimesheets = async (req, res) => {
  try {
    const { month, page = 1, limit = 31 } = req.query;
    const filter = { employee: req.user._id };
    if (month) {
      filter.date = {
        $gte: moment(month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD'),
        $lte: moment(month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD')
      };
    }
    const records = await Timesheet.find(filter).sort({ date: -1 }).limit(limit * 1).skip((page - 1) * limit).populate('approvedBy', 'fullName');
    const total   = await Timesheet.countDocuments(filter);
    const stats   = records.reduce((a, r) => {
      a.totalWorkHours  += r.totalWorkHours  || 0;
      a.overtimeMinutes += r.overtimeMinutes || 0;
      if (['present','late'].includes(r.status)) a.presentDays++;
      if (r.status === 'absent')   a.absentDays++;
      if (r.status === 'on-leave') a.leaveDays++;
      if (r.isLate) a.lateDays++;
      return a;
    }, { totalWorkHours: 0, overtimeMinutes: 0, presentDays: 0, absentDays: 0, leaveDays: 0, lateDays: 0 });
    res.json({ records, total, page: +page, stats });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllTimesheets = async (req, res) => {
  try {
    const { date, month, employeeId, department, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (date)   filter.date   = date;
    if (status) filter.status = status;
    if (month)  filter.date   = { $gte: moment(month,'YYYY-MM').startOf('month').format('YYYY-MM-DD'), $lte: moment(month,'YYYY-MM').endOf('month').format('YYYY-MM-DD') };
    if (employeeId) { const u = await User.findOne({ employeeId }); if (u) filter.employee = u._id; }
    if (department) { const us = await User.find({ department }).select('_id'); filter.employee = { $in: us.map(u => u._id) }; }
    const records = await Timesheet.find(filter).sort({ date: -1 }).limit(limit * 1).skip((page - 1) * limit).populate('employee', 'firstName lastName employeeId department designation avatar');
    const total   = await Timesheet.countDocuments(filter);
    res.json({ records, total, page: +page });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.approveTimesheet = async (req, res) => {
  try {
    const record = await Timesheet.findByIdAndUpdate(req.params.id, { isApproved: true, approvedBy: req.user._id }, { new: true });
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json({ message: 'Timesheet approved', record });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
