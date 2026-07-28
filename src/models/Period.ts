import mongoose from 'mongoose';

const RulesetSchema = new mongoose.Schema({
  shift_start: { type: String, required: true },
  shift_end: { type: String, required: true },
  grace_until: { type: String, required: true },
  half_day_if_in_after: { type: String, required: true },
  half_day_if_out_before: { type: String, required: true },
  late_strike_window: [{ type: String }],
  early_strike_window: [{ type: String }],
  strikes_per_penalty: { type: Number, required: true },
  penalty_days_per_trigger: { type: Number, required: true },
  sandwich_skips_weekly_off: { type: Boolean, required: true }
}, { _id: false });

const PeriodSchema = new mongoose.Schema({
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  divisorDays: { type: Number, required: true },
  ruleset: { type: RulesetSchema, required: true },
  status: { type: String, enum: ['open', 'locked'], default: 'open' }
}, { timestamps: true });

PeriodSchema.index({ month: 1, year: 1 }, { unique: true });

export const Period = mongoose.models.Period || mongoose.model('Period', PeriodSchema);
