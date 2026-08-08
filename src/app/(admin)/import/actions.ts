'use server';

import { requireSession } from '@/lib/auth';
import { parseBiometricFile } from '@/lib/parser/biometric';

export async function previewBiometricFile(formData: FormData) {
  await requireSession();

  const file = formData.get('file') as File;
  const month = parseInt(formData.get('month') as string, 10);
  const year = parseInt(formData.get('year') as string, 10);

  try {
    if (!file) return { success: false, error: 'No file uploaded' };
    if (isNaN(month) || isNaN(year)) return { success: false, error: 'Invalid month or year' };
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Using our previously verified parser
    const res = parseBiometricFile(buffer, month, year);
    if (!res.ok) {
      throw new Error(res.errors?.join(', ') || 'Failed to parse file');
    }
    
    const records = res.days;
    // Sort records logically: machineId then date
    records.sort((a, b) => {
      if (a.machineId !== b.machineId) return a.machineId - b.machineId;
      return a.date.localeCompare(b.date);
    });

    return {
      success: true,
      records
    };
  } catch (error: any) {
    console.error('File parsing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to parse file'
    };
  }
}
