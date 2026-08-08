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
  try {
    await dbConnect();

    const { employeeId, pan, fromDate, toDate, kind, note } = formData;

    if (!employeeId || !pan || !fromDate || !toDate || !kind) {
      return { error: 'All asterisk (*) fields are required' };
    }

    const employee = await Employee.findOne({ _id: employeeId, endDate: null, isIgnored: false }).lean();
    if (!employee) {
      return { error: 'Employee not found or is inactive.' };
    }

    const clean = (val: string) => (val || '').trim().replace(/[\s-]/g, '').toUpperCase();
    
    if (clean(employee.panNumber) !== clean(pan)) {
      return { error: 'Verification failed. The PAN number provided is incorrect.' };
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return { error: 'Invalid date range' };
    }

    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const entries = dates.map(date => ({
      employeeId: employee._id,
      date,
      kind,
      status: 'pending',
      note: note ? `[Self Submitted] ${note}` : '[Self Submitted]',
      loggedAt: new Date(),
    }));

    await LeaveEntry.insertMany(entries, { ordered: false });
    revalidatePath(`/employees/${employee._id}/leave`);
    return { success: true };
  } catch (error: any) {
    if (error.code !== 11000) {
      return { error: error.message || 'An unexpected error occurred' };
    }
    const { employeeId } = formData;
    revalidatePath(`/employees/${employeeId}/leave`);
    return { success: true };
  }
}
