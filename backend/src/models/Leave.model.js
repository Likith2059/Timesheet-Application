const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'casual', 'unpaid', 'maternity', 'paternity', 'bereavement'],
    required: true
  },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  totalDays:   { type: Number, required: true, min: 0.5 },
  isHalfDay:   { type: Boolean, default: false },
  halfDayType: { type: String, enum: ['morning', 'afternoon'] },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: { type: Date },
  reviewNote:  { type: String, trim: true, maxlength: 500 },
  attachments: [{ type: String }] // file URLs
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

leaveSchema.virtual('durationLabel').get(function () {
  return `${this.totalDays} day${this.totalDays > 1 ? 's' : ''}`;
});

module.exports = mongoose.model('Leave', leaveSchema);
