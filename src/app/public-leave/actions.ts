'use server';

import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { LeaveEntry } from '@/models/LeaveEntry';
import { revalidatePath } from 'next/cache';

export async function submitPublicLeave(formData: {
  employeeId: number;
  pan: string;
  fromDate: string;
  toDate: string;
  kind: 'paid' | 'unpaid';
  note?: string;
}) {
  await dbConnect();

  const { employeeId, pan, fromDate, toDate, kind, note } = formData;

  if (!employeeId || !pan || !fromDate || !toDate || !kind) {
    throw new Error('All asterisk (*) fields are required');
  }

  const employee = await Employee.findOne({ _id: employeeId, endDate: null, isIgnored: false }).lean();
  if (!employee) {
    throw new Error('Employee not found or is inactive.');
  }

  const clean = (val: string) => (val || '').trim().replace(/[\s-]/g, '').toUpperCase();
  
  if (clean(employee.panNumber) !== clean(pan)) {
    throw new Error('Verification failed. The PAN number provided is incorrect.');
  }

  const start = new Date(fromDate);
  const end = new Date(toDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    throw new Error('Invalid date range');
  }

  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  try {
    const entries = dates.map(date => ({
      employeeId: employee._id,
      date,
      kind,
      status: 'pending',
      note: note ? `[Self Submitted] ${note}` : '[Self Submitted]',
      loggedAt: new Date(),
    }));

    await LeaveEntry.insertMany(entries, { ordered: false });
  } catch (error: any) {
    // ordered: false allows inserting non-duplicates even if some exist
    if (error.code !== 11000) {
      throw error;
    }
  }

  revalidatePath(`/employees/${employee._id}/leave`);
}
