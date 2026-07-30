import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import { PayrollLine } from '@/models/PayrollLine';
import { Employee } from '@/models/Employee';
import ExcelJS from 'exceljs';
import { generateSalarySheet } from '@/lib/export/salarySheet';

export async function GET(req: NextRequest, { params }: { params: Promise<{ periodId: string }> }) {
  try {
    await requireSession();
    await dbConnect();

    const { periodId } = await params;

    const period = await Period.findById(periodId).lean();
    if (!period) return new NextResponse('Period not found', { status: 404 });
    if (period.status !== 'locked') return new NextResponse('Period must be locked to export', { status: 400 });

    const lines = await PayrollLine.find({ periodId: periodId }).lean();
    const employees = await Employee.find({ isIgnored: false }).lean();

    const workbook = generateSalarySheet(period, lines, employees);

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Salary_Sheet_${period.year}_${period.month}.xlsx"`
      }
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
