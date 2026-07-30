import mongoose from 'mongoose';

const LedgerEntrySchema = new mongoose.Schema({
  employeeId: { type: Number, ref: 'Employee', required: true },
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', default: null },
  date: { type: String, required: true }, // yyyy-MM-dd
  type: { type: String, enum: ['opening', 'advance', 'deduction'], required: true },
  amount: { type: Number, required: true }, // integer rupees
  note: { type: String, required: true }
}, { timestamps: true });

LedgerEntrySchema.index({ employeeId: 1, date: 1 });

export const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', LedgerEntrySchema);
