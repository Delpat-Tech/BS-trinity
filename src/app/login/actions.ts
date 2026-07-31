'use server';

import dbConnect from '@/lib/db';
import { CompanySettings } from '@/models/CompanySettings';

export async function getCompanySettings() {
  await dbConnect();
  let settings = await CompanySettings.findOne({});
  if (!settings) {
    settings = await CompanySettings.create({});
  }
  return JSON.parse(JSON.stringify(settings));
}
