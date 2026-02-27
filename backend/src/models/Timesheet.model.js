const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema({
  breakStart: { type: Date },
  breakEnd:   { type: Date },
  duration:   { type: Number, default: 0 }
}, { _id: false });

const timesheetSchema = new mongoose.Schema({
  employee:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:              { type: String, required: true, index: true },
  clockIn:           { type: Date },
  clockOut:          { type: Date },
  breaks:            [breakSchema],
  totalBreakMinutes: { type: Number, default: 0 },
  totalWorkMinutes:  { type: Number, default: 0 },
  totalWorkHours:    { type: Number, default: 0 },
  overtimeMinutes:   { type: Number, default: 0 },
  status:            { type: String, enum: ['present','absent','half-day','late','on-leave','holiday','weekend'], default: 'present' },
  isLate:            { type: Boolean, default: false },
  lateByMinutes:     { type: Number, default: 0 },
  notes:             { type: String, trim: true, maxlength: 500 },
  isOnBreak:         { type: Boolean, default: false },
  isApproved:        { type: Boolean, default: false },
  approvedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ipAddress:         { type: String }
}, { timestamps: true, toJSON: { virtuals: true } });

timesheetSchema.index({ employee: 1, date: 1 }, { unique: true });

timesheetSchema.pre('save', function (next) {
  if (this.clockIn && this.clockOut) {
    const totalMin         = Math.floor((this.clockOut - this.clockIn) / 60000);
    this.totalBreakMinutes = this.breaks.reduce((s, b) => s + (b.duration || 0), 0);
    this.totalWorkMinutes  = Math.max(0, totalMin - this.totalBreakMinutes);
    this.totalWorkHours    = parseFloat((this.totalWorkMinutes / 60).toFixed(2));
    this.overtimeMinutes   = Math.max(0, this.totalWorkMinutes - 480);
  }
  next();
});

module.exports = mongoose.model('Timesheet', timesheetSchema);
