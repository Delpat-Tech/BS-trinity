import mongoose from 'mongoose';

const AttendanceDaySchema = new mongoose.Schema({
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: String, required: true }, // yyyy-MM-dd
  shift: { type: String, default: null },
  inTime: { type: String, default: null }, // HH:mm:ss
  outTime: { type: String, default: null }, // HH:mm:ss
  durationMins: { type: Number, default: null },
  machineStatus: { type: String, enum: ['P', 'A', 'WO', 'WOP'], required: true },
  finalStatus: { type: String, default: null },
  overrideReason: { type: String, default: null },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  overriddenAt: { type: Date, default: null },
  resolved: { type: Boolean, default: true } // false if missing data prevents calculation (an exception)
});

AttendanceDaySchema.index({ periodId: 1, employeeId: 1, date: 1 }, { unique: true });
AttendanceDaySchema.index({ periodId: 1, date: 1 });

export const AttendanceDay = mongoose.models.AttendanceDay || mongoose.model('AttendanceDay', AttendanceDaySchema);
