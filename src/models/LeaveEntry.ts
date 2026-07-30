import mongoose from 'mongoose';

const LeaveEntrySchema = new mongoose.Schema({
  employeeId: { type: Number, ref: 'Employee', required: true },
  date: { type: String, required: true }, // yyyy-MM-dd
  kind: { type: String, enum: ['paid', 'unpaid', 'half'], required: true },
  note: { type: String },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  loggedAt: { type: Date }
}, { timestamps: true });

LeaveEntrySchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const LeaveEntry = mongoose.models.LeaveEntry || mongoose.model('LeaveEntry', LeaveEntrySchema);
