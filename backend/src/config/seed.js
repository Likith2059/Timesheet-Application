const mongoose = require('mongoose');
const User      = require('../models/User.model');
const Timesheet = require('../models/Timesheet.model');
const moment    = require('moment');
require('dotenv').config();

const seed = async () => {
  try {
    // In K8s: MONGO_URI=mongodb://mongo-service:27017/timesheet_db
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://mongo-service:27017/timesheet_db');
    console.log('🔗 Connected to MongoDB');

    await User.deleteMany({});
    await Timesheet.deleteMany({});
    console.log('🗑️  Cleared existing data');

    const admin = await User.create({ employeeId: 'EMP00001', firstName: 'System', lastName: 'Admin', email: 'admin@company.com', password: 'Admin@123', role: 'admin', department: 'IT', designation: 'System Administrator' });
    const manager = await User.create({ employeeId: 'EMP00002', firstName: 'Sarah', lastName: 'Johnson', email: 'manager@company.com', password: 'Manager@123', role: 'manager', department: 'Engineering', designation: 'Engineering Manager' });
    const employees = await User.create([
      { firstName: 'John',  lastName: 'Doe',    email: 'john.doe@company.com',    password: 'Emp@1234', role: 'employee', department: 'Engineering', designation: 'Software Engineer' },
      { firstName: 'Jane',  lastName: 'Smith',  email: 'jane.smith@company.com',  password: 'Emp@1234', role: 'employee', department: 'Engineering', designation: 'Frontend Developer' },
      { firstName: 'Mike',  lastName: 'Wilson', email: 'mike.wilson@company.com', password: 'Emp@1234', role: 'employee', department: 'HR',          designation: 'HR Executive' },
      { firstName: 'Emily', lastName: 'Chen',   email: 'emily.chen@company.com',  password: 'Emp@1234', role: 'employee', department: 'Finance',     designation: 'Financial Analyst' },
    ]);

    const allUsers = [manager, ...employees];
    const timesheets = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      if (date.day() === 0 || date.day() === 6) continue;
      for (const user of allUsers) {
        const clockIn  = date.clone().hour(9).minute(Math.floor(Math.random() * 20));
        const clockOut = date.clone().hour(18).minute(Math.floor(Math.random() * 30));
        const isLate   = clockIn.minute() > 10;
        const totalMin = Math.floor((clockOut.toDate() - clockIn.toDate()) / 60000);
        timesheets.push({ employee: user._id, date: date.format('YYYY-MM-DD'), clockIn: clockIn.toDate(), clockOut: clockOut.toDate(), status: isLate ? 'late' : 'present', isLate, lateByMinutes: isLate ? clockIn.minute() - 10 : 0, totalWorkMinutes: totalMin, totalWorkHours: parseFloat((totalMin/60).toFixed(2)), overtimeMinutes: Math.max(0, totalMin - 480), isApproved: true });
      }
    }
    await Timesheet.insertMany(timesheets);

    console.log('\n📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 Admin:    admin@company.com    / Admin@123');
    console.log('👔 Manager:  manager@company.com  / Manager@123');
    console.log('👤 Employee: john.doe@company.com / Emp@1234');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
