import mongoose from 'mongoose';

const HolidaySchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // yyyy-MM-dd
  name: { type: String, required: true },
  sandwichEligible: { type: Boolean, required: true, default: true }
}, { timestamps: true });

export const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);
