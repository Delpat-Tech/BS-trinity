'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Employee } from '@/models/Employee';
import { revalidatePath } from 'next/cache';

export async function createEmployee(data: {
  machineId: number;
  name: string;
  dateOfJoining: string;
  fixedSalary: number;
  isIgnored: boolean;
}) {
  await requireSession();
  await dbConnect();

  const existing = await Employee.findOne({ machineId: data.machineId });
  if (existing) {
    throw new Error('Employee with this Machine ID already exists');
  }

  await Employee.create({
    _id: data.machineId,
    machineId: data.machineId,
    name: data.name,
    dateOfJoining: data.dateOfJoining,
    isIgnored: data.isIgnored,
    salaryRevisions: [{
      fixedSalary: data.fixedSalary,
      effectiveFrom: data.dateOfJoining // Base revision starts at DOJ
    }]
  });

  revalidatePath('/employees');
  return { success: true };
}

export async function updateEmployee(id: number, data: {
  name: string;
  dateOfJoining: string;
  isIgnored: boolean;
  fixedSalary: number;
  effectiveFrom: string;
}) {
  await requireSession();
  await dbConnect();

  const emp = await Employee.findById(id);
  if (!emp) throw new Error('Employee not found');

  emp.name = data.name;
  emp.dateOfJoining = data.dateOfJoining;
  emp.isIgnored = data.isIgnored;

  // Check if we need to add a new salary revision
  const latestRev = [...emp.salaryRevisions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  
  if (latestRev && latestRev.fixedSalary !== data.fixedSalary) {
    // If effective date already exists, update it, else append
    const existingDateRev = emp.salaryRevisions.find((r: any) => r.effectiveFrom === data.effectiveFrom);
    if (existingDateRev) {
      existingDateRev.fixedSalary = data.fixedSalary;
    } else {
      emp.salaryRevisions.push({
        fixedSalary: data.fixedSalary,
        effectiveFrom: data.effectiveFrom || new Date().toISOString().split('T')[0]
      });
    }
  }

  await emp.save();
  revalidatePath('/employees');
  return { success: true };
}
