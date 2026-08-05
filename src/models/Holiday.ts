import mongoose from 'mongoose';

const HolidaySchema = new mongoose.Schema({
  date: { type: String, required: true }, // yyyy-MM-dd
  name: { type: String, required: true },
  sandwichEligible: { type: Boolean, required: true, default: true },
  isHalfDay: { type: Boolean, default: false },
  recurrence: { type: String, enum: ['none', 'monthly', 'yearly'], default: 'none' }
}, { timestamps: true });

// Ensure unique combination of date and recurrence (to avoid duplicate entries for the same date/recurrence type)
HolidaySchema.index({ date: 1, recurrence: 1 }, { unique: true });

export const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);
