const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true
  },
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
  },
  password: { type: String, required: true, minlength: 6, select: false },
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee'],
    default: 'employee'
  },
  department: { type: String, trim: true, default: 'General' },
  designation: { type: String, trim: true, default: 'Employee' },
  phone: { type: String, trim: true },
  avatar: { type: String, default: '' },
  joiningDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  workSchedule: {
    startTime: { type: String, default: '09:00' },
    endTime:   { type: String, default: '18:00' },
    workDays:  { type: [Number], default: [1, 2, 3, 4, 5] } // Mon-Fri
  },
  leaveBalance: {
    annual:    { type: Number, default: 21 },
    sick:      { type: Number, default: 10 },
    casual:    { type: Number, default: 7 },
    unpaid:    { type: Number, default: 0 }
  },
  lastLogin: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save: hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Auto-generate employeeId
userSchema.pre('validate', async function (next) {
  if (this.isNew && !this.employeeId) {
    const count = await mongoose.model('User').countDocuments();
    this.employeeId = `EMP${String(count + 1001).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
