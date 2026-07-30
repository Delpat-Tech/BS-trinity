'use server';

import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { LeaveEntry } from '@/models/LeaveEntry';
import { revalidatePath } from 'next/cache';

export async function submitPublicLeave(formData: {
  name: string;
  mobile: string;
  aadhar: string;
  pan: string;
  date: string;
  note?: string;
}) {
  await dbConnect();

  const { name, mobile, aadhar, pan, date, note } = formData;

  if (!name || !mobile || !aadhar || !pan || !date) {
    throw new Error('All asterisk (*) fields are required');
  }

  // Fetch active employees
  const employees = await Employee.find({ endDate: null, isIgnored: false }).lean();

  // Find matches by cleaning and normalizing fields
  const clean = (val: string) => (val || '').trim().replace(/[\s-]/g, '').toUpperCase();
  const cleanName = (val: string) => (val || '').trim().toLowerCase();

  const matched = employees.find((emp: any) => {
    return (
      cleanName(emp.name) === cleanName(name) &&
      clean(emp.mobileNumber) === clean(mobile) &&
      clean(emp.aadharNumber) === clean(aadhar) &&
      clean(emp.panNumber) === clean(pan)
    );
  });

  if (!matched) {
    throw new Error(
      'Verification failed. Please ensure your Name, Mobile, Aadhaar, and PAN numbers are correct and match your employee record.'
    );
  }

  try {
    await LeaveEntry.create({
      employeeId: matched._id,
      date,
      kind: 'unpaid', // unpaid leave for now as requested
      note: note ? `[Self Submitted] ${note}` : '[Self Submitted]',
      loggedAt: new Date(),
    });
  } catch (error: any) {
    if (error.code === 11000) {
      throw new Error('A leave entry already exists for you on this date.');
    }
    throw error;
  }

  revalidatePath(`/employees/${matched._id}/leave`);
}
