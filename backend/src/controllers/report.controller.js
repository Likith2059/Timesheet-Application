const moment     = require('moment');
const PDFDocument = require('pdfkit');
const { Parser }  = require('json2csv');
const Timesheet   = require('../models/Timesheet.model');
const User        = require('../models/User.model');
const Leave       = require('../models/Leave.model');

// GET /api/reports/attendance?month=2024-01&format=json|csv|pdf
exports.attendanceReport = async (req, res) => {
  try {
    const { month = moment().format('YYYY-MM'), employeeId, department, format = 'json' } = req.query;

    const startDate = moment(month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
    const endDate   = moment(month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');

    const filter = { date: { $gte: startDate, $lte: endDate } };

    if (employeeId) {
      const emp = await User.findOne({ employeeId });
      if (emp) filter.employee = emp._id;
    } else if (department) {
      const users = await User.find({ department, isActive: true }).select('_id');
      filter.employee = { $in: users.map(u => u._id) };
    }

    const records = await Timesheet.find(filter)
      .sort({ date: 1 })
      .populate('employee', 'firstName lastName employeeId department designation');

    const data = records.map(r => ({
      employeeId:     r.employee?.employeeId || '',
      employeeName:   r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '',
      department:     r.employee?.department || '',
      date:           r.date,
      clockIn:        r.clockIn  ? moment(r.clockIn).format('HH:mm')  : '-',
      clockOut:       r.clockOut ? moment(r.clockOut).format('HH:mm') : '-',
      totalWorkHours: r.totalWorkHours || 0,
      breakMinutes:   r.totalBreakMinutes || 0,
      overtimeMinutes: r.overtimeMinutes || 0,
      status:         r.status,
      isLate:         r.isLate ? 'Yes' : 'No',
      lateByMinutes:  r.lateByMinutes || 0,
      isApproved:     r.isApproved ? 'Yes' : 'No',
    }));

    if (format === 'csv') {
      const parser = new Parser({ fields: Object.keys(data[0] || {}) });
      const csv    = parser.parse(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${month}.csv"`);
      return res.send(csv);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${month}.pdf"`);
      doc.pipe(res);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
      doc.fontSize(11).font('Helvetica').text(`Period: ${month}`, { align: 'center' });
      doc.moveDown();

      // Table header
      const cols = [60, 130, 80, 60, 55, 55, 65, 55, 60, 60];
      const headers = ['Emp ID', 'Name', 'Department', 'Date', 'In', 'Out', 'Hours', 'Break', 'Status', 'Late?'];
      let x = 40, y = doc.y;

      doc.font('Helvetica-Bold').fontSize(8);
      headers.forEach((h, i) => { doc.text(h, x, y, { width: cols[i] }); x += cols[i]; });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke();
      doc.moveDown(0.3);

      // Rows
      doc.font('Helvetica').fontSize(7.5);
      data.forEach((row, idx) => {
        if (doc.y > 530) { doc.addPage({ layout: 'landscape' }); }
        x = 40; y = doc.y;
        const vals = [
          row.employeeId, row.employeeName, row.department, row.date,
          row.clockIn, row.clockOut, String(row.totalWorkHours),
          String(row.breakMinutes) + 'm', row.status, row.isLate
        ];
        if (idx % 2 === 0) {
          doc.rect(40, y - 2, 760, 14).fill('#f5f5f5').fillColor('black');
        }
        vals.forEach((v, i) => { doc.text(v, x, y, { width: cols[i] }); x += cols[i]; });
        doc.moveDown(0.6);
      });

      doc.end();
      return;
    }

    // JSON summary
    const summary = {
      month,
      totalRecords:   data.length,
      totalPresent:   data.filter(d => d.status === 'present' || d.status === 'late').length,
      totalAbsent:    data.filter(d => d.status === 'absent').length,
      totalOnLeave:   data.filter(d => d.status === 'on-leave').length,
      totalLate:      data.filter(d => d.isLate === 'Yes').length,
      avgWorkHours:   data.length ? (data.reduce((s, d) => s + d.totalWorkHours, 0) / data.length).toFixed(2) : 0
    };

    res.json({ summary, records: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reports/summary?month=2024-01
exports.dashboardSummary = async (req, res) => {
  try {
    const today     = moment().format('YYYY-MM-DD');
    const monthStart = moment().startOf('month').format('YYYY-MM-DD');
    const monthEnd   = moment().endOf('month').format('YYYY-MM-DD');

    const [totalEmployees, activeToday, pendingLeaves, monthRecords] = await Promise.all([
      User.countDocuments({ isActive: true, role: { $ne: 'admin' } }),
      Timesheet.countDocuments({ date: today, clockIn: { $exists: true }, clockOut: { $exists: false } }),
      Leave.countDocuments({ status: 'pending' }),
      Timesheet.find({ date: { $gte: monthStart, $lte: monthEnd } })
    ]);

    const presentToday  = await Timesheet.countDocuments({ date: today, status: { $in: ['present', 'late'] } });
    const absentToday   = totalEmployees - presentToday;
    const avgWorkHours  = monthRecords.length
      ? (monthRecords.reduce((s, r) => s + (r.totalWorkHours || 0), 0) / monthRecords.length).toFixed(2)
      : 0;
    const totalOvertime = monthRecords.reduce((s, r) => s + (r.overtimeMinutes || 0), 0);
    const lateThisMonth = monthRecords.filter(r => r.isLate).length;

    // Department-wise attendance today
    const deptStats = await Timesheet.aggregate([
      { $match: { date: today } },
      { $lookup: { from: 'users', localField: 'employee', foreignField: '_id', as: 'emp' } },
      { $unwind: '$emp' },
      { $group: { _id: '$emp.department', present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      today: {
        date: today,
        totalEmployees,
        presentToday,
        absentToday,
        activeToday,
        pendingLeaves
      },
      month: {
        avgWorkHours: +avgWorkHours,
        totalOvertimeHours: +(totalOvertime / 60).toFixed(2),
        lateCount: lateThisMonth
      },
      departmentStats: deptStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
