import mongoose, { Schema } from 'mongoose';

const CompanySettingsSchema = new Schema({
  companyName: { type: String, default: 'PENTAGON SYSTEMS AND SERVICES' },
  tagline: { type: String, default: 'Completly Computers — Securely access your service report & ticket management system.' },
  address: { type: String, default: '1399-B, Sadashiv Peth, 301/302 Saraswati Sadan, Nr Pune Vidyarthi Gruha, Opp. Paranjape Shani Mandir, Pune 411030.' },
  phone: { type: String, default: 'Phone: 9307906257 / 020 24495338 / 020 24495441' },
  email: { type: String, default: 'pentagonsystems@anaspures.com' },
  logoUrl: { type: String, default: '' },
  footerText: { type: String, default: 'Pentagon Systems and Services' },
  termsAndConditions: { type: [String], default: [] },
  ticketPrefix: { type: String, default: 'PSS' }
}, {
  timestamps: true
});

export const CompanySettings = mongoose.models.CompanySettings || mongoose.model('CompanySettings', CompanySettingsSchema);
