import mongoose from 'mongoose';

const ImportSchema = new mongoose.Schema({
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
  uploadedAt: { type: Date, default: Date.now },
  fileName: { type: String, required: true },
  fileHash: { type: String, required: true },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordsCreated: { type: Number, required: true }
});

ImportSchema.index({ periodId: 1, fileHash: 1 }, { unique: true });

export const Import = mongoose.models.Import || mongoose.model('Import', ImportSchema);
