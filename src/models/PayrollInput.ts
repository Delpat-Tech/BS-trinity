import mongoose from 'mongoose';

const PayrollInputSchema = new mongoose.Schema({
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
  employeeId: { type: Number, ref: 'Employee', required: true },
  ewDays: { type: Number, default: null },
  incentive: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  advanceDeduction: { type: Number, default: 0 },
  latePunchAmt: { type: Number, default: 0 },
  otherDebit: { type: Number, default: 0 }
}, { timestamps: true });

PayrollInputSchema.index({ periodId: 1, employeeId: 1 }, { unique: true });

export const PayrollInput = mongoose.models.PayrollInput || mongoose.model('PayrollInput', PayrollInputSchema);
