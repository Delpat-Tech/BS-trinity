import dbConnect from '@/lib/db';
import { Period } from '@/models/Period';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { openPeriod } from './actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await dbConnect();
  
  const periods = await Period.find().sort({ year: -1, month: -1 }).lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-slate-500">
          Manage your payroll periods. Open a new period to lock in the current ruleset and start processing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Open Periods</h2>
          {periods.length === 0 ? (
            <div className="p-8 border rounded-lg bg-white shadow-sm text-center text-slate-500">
              No periods found. Create one to begin.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {periods.map((period: any) => {
                const date = new Date(period.year, period.month - 1);
                const monthName = date.toLocaleString('default', { month: 'long' });
                return (
                  <Card key={period._id.toString()}>
                    <CardHeader className="pb-2">
                      <CardTitle>{monthName} {period.year}</CardTitle>
                      <CardDescription>
                        Status: <span className={period.status === 'locked' ? 'text-red-600 font-medium' : 'text-green-600 font-medium capitalize'}>{period.status}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm mb-4">
                        <span className="text-slate-500">Divisor Days:</span>
                        <span className="font-medium">{period.divisorDays}</span>
                      </div>
                      <Link href={`/period/${period._id.toString()}`} passHref>
                        <Button className="w-full" variant={period.status === 'locked' ? 'outline' : 'default'}>
                          {period.status === 'locked' ? 'View Details' : 'Manage Payroll'}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Open New Period</CardTitle>
              <CardDescription>
                Creates a new payroll period and pins a copy of the current global ruleset to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={openPeriod} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <select 
                    id="month"
                    name="month"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue={new Date().getMonth() + 1}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <select 
                    id="year"
                    name="year"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    defaultValue={new Date().getFullYear()}
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="divisorDays">Divisor Days</Label>
                  <Input id="divisorDays" name="divisorDays" type="number" step="0.5" defaultValue={26} required />
                  <p className="text-xs text-slate-500">Base days used to calculate daily rates (e.g. 26 or 30).</p>
                </div>
                <Button type="submit" className="w-full">
                  Create Period
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
