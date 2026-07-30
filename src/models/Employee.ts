import mongoose from 'mongoose';

const SalaryRevisionSchema = new mongoose.Schema({
  fixedSalary: { type: Number, required: true },
  effectiveFrom: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const EmployeeSchema = new mongoose.Schema({
  _id: { type: Number, required: true },
  machineId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  designation: { type: String },
  mobileNumber: { type: String },
  dateOfJoining: { type: String, required: true }, // yyyy-MM-dd
  endDate: { type: String, default: null }, // yyyy-MM-dd
  isIgnored: { type: Boolean, default: false },
  paymentMode: { type: String }, // "Cash" | "Bank"
  aadharNumber: { type: String },
  panNumber: { type: String },
  bankAccount: { type: String },
  ifsc: { type: String },
  weeklyOff: { type: Number, default: 0 }, // 0 = Sunday, 1 = Monday, etc.
  salaryRevisions: [SalaryRevisionSchema]
}, { timestamps: true });

export const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
