import mongoose from 'mongoose';

const SalaryRevisionSchema = new mongoose.Schema({
  fixedSalary: { type: Number, required: true },
  effectiveFrom: { type: String, required: true }
}, { _id: false });

const EmployeeSchema = new mongoose.Schema({
  machineId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  designation: { type: String },
  dateOfJoining: { type: String, required: true }, // yyyy-MM-dd
  endDate: { type: String, default: null }, // yyyy-MM-dd
  isIgnored: { type: Boolean, default: false },
  paymentMode: { type: String }, // "Cash" | "Bank"
  salaryRevisions: [SalaryRevisionSchema]
}, { timestamps: true });

export const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
