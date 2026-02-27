const mongoose = require('mongoose');
const User = require('../models/User.model');
const Timesheet = require('../models/Timesheet.model');
const moment = require('moment');
require('dotenv').config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/timesheet_db');
    console.log('🔗 Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Timesheet.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin
    const admin = await User.create({
      employeeId: 'EMP00001',
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@company.com',
      password: 'Admin@123',
      role: 'admin',
      department: 'IT',
      designation: 'System Administrator'
    });

    // Create manager
    const manager = await User.create({
      employeeId: 'EMP00002',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'manager@company.com',
      password: 'Manager@123',
      role: 'manager',
      department: 'Engineering',
      designation: 'Engineering Manager'
    });

    // Create employees
    const employees = await User.create([
      { firstName: 'John',    lastName: 'Doe',    email: 'john.doe@company.com',    password: 'Emp@1234', role: 'employee', department: 'Engineering', designation: 'Software Engineer' },
      { firstName: 'Jane',    lastName: 'Smith',  email: 'jane.smith@company.com',  password: 'Emp@1234', role: 'employee', department: 'Engineering', designation: 'Frontend Developer' },
      { firstName: 'Mike',    lastName: 'Wilson', email: 'mike.wilson@company.com', password: 'Emp@1234', role: 'employee', department: 'HR',          designation: 'HR Executive' },
      { firstName: 'Emily',   lastName: 'Chen',   email: 'emily.chen@company.com',  password: 'Emp@1234', role: 'employee', department: 'Finance',     designation: 'Financial Analyst' },
    ]);

    // Seed last 7 days timesheet for first employee
    const allUsers = [manager, ...employees];
    const timesheets = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      if (date.day() === 0 || date.day() === 6) continue; // skip weekends

      for (const user of allUsers) {
        const clockIn  = date.clone().hour(9).minute(Math.floor(Math.random() * 20)).second(0);
        const clockOut = date.clone().hour(18).minute(Math.floor(Math.random() * 30)).second(0);
        const isLate   = clockIn.minute() > 10;

        timesheets.push({
          employee: user._id,
          date: date.format('YYYY-MM-DD'),
          clockIn: clockIn.toDate(),
          clockOut: clockOut.toDate(),
          status: isLate ? 'late' : 'present',
          isLate,
          lateByMinutes: isLate ? clockIn.minute() - 10 : 0,
          isApproved: true
        });
      }
    }

    // Compute totals manually for seed
    for (const t of timesheets) {
      const totalMs  = t.clockOut - t.clockIn;
      t.totalWorkMinutes = Math.floor(totalMs / 60000);
      t.totalWorkHours   = parseFloat((t.totalWorkMinutes / 60).toFixed(2));
      t.overtimeMinutes  = Math.max(0, t.totalWorkMinutes - 480);
    }

    await Timesheet.insertMany(timesheets);

    console.log(`✅ Seed complete!`);
    console.log('\n📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 Admin:   admin@company.com    / Admin@123');
    console.log('👔 Manager: manager@company.com  / Manager@123');
    console.log('👤 Employee: john.doe@company.com / Emp@1234');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
