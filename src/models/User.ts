import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'hr'], default: 'admin', required: true }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
