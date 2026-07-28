import mongoose from 'mongoose';

const PayrollLineSchema = new mongoose.Schema({
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  fixedSalary: { type: Number, required: true },
  divisorDays: { type: Number, required: true },
  dailyRate: { type: Number, required: true },
  presentDays: { type: Number, required: true },
  halfDays: { type: Number, required: true },
  absDays: { type: Number, required: true },
  paidLeaveDays: { type: Number, required: true },
  unpaidLeaveDays: { type: Number, required: true },
  outOfServiceDays: { type: Number, required: true },
  lateStrikes: { type: Number, required: true },
  earlyStrikes: { type: Number, required: true },
  penaltyDays: { type: Number, required: true },
  ewDays: { type: Number, required: true },
  totalPaidDays: { type: Number, required: true },
  gross: { type: Number, required: true },
  incentive: { type: Number, required: true },
  bonus: { type: Number, required: true },
  advanceDeduction: { type: Number, required: true },
  advanceCarried: { type: Number, required: true },
  latePunchAmt: { type: Number, required: true },
  otherDebit: { type: Number, required: true },
  net: { type: Number, required: true }
}, { timestamps: true });

PayrollLineSchema.index({ periodId: 1, employeeId: 1 }, { unique: true });

export const PayrollLine = mongoose.models.PayrollLine || mongoose.model('PayrollLine', PayrollLineSchema);
