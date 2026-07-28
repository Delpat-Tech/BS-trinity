'use server';

import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { AttendanceDay } from '@/models/AttendanceDay';
import { revalidatePath } from 'next/cache';

export async function reopenResolvedDay(attendanceId: string, employeeId: string) {
  await requireSession();
  await dbConnect();
  
  await AttendanceDay.updateOne(
    { _id: attendanceId },
    { 
      $set: { 
        finalStatus: null,
        overrideReason: null,
        overriddenBy: null,
        overriddenAt: null
      } 
    }
  );

  revalidatePath(`/employees/${employeeId}/history`);
  return { success: true };
}
