const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
  breakStart: { type: Date },
  breakEnd:   { type: Date },
  duration:   { type: Number, default: 0 } // minutes
}, { _id: false });

const timesheetSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  clockIn: { type: Date },
  clockOut: { type: Date },
  breaks: [breakSchema],
  totalBreakMinutes: { type: Number, default: 0 },
  totalWorkMinutes:  { type: Number, default: 0 },
  totalWorkHours:    { type: Number, default: 0 },
  overtimeMinutes:   { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'late', 'on-leave', 'holiday', 'weekend'],
    default: 'present'
  },
  isLate: { type: Boolean, default: false },
  lateByMinutes: { type: Number, default: 0 },
  notes: { type: String, trim: true, maxlength: 500 },
  location: {
    clockInLocation:  { lat: Number, lng: Number, address: String },
    clockOutLocation: { lat: Number, lng: Number, address: String }
  },
  ipAddress: { type: String },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isApproved: { type: Boolean, default: false },
  isOnBreak: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Compound unique index: one record per employee per day
timesheetSchema.index({ employee: 1, date: 1 }, { unique: true });

// Pre-save: compute totals
timesheetSchema.pre('save', function (next) {
  if (this.clockIn && this.clockOut) {
    const totalMs  = this.clockOut - this.clockIn;
    const totalMin = Math.floor(totalMs / 60000);
    this.totalBreakMinutes = this.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    this.totalWorkMinutes  = Math.max(0, totalMin - this.totalBreakMinutes);
    this.totalWorkHours    = parseFloat((this.totalWorkMinutes / 60).toFixed(2));
    const standardMinutes  = 8 * 60; // 8 hours
    this.overtimeMinutes   = Math.max(0, this.totalWorkMinutes - standardMinutes);
  }
  next();
});

module.exports = mongoose.model('Timesheet', timesheetSchema);
