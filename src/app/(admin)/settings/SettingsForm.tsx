'use client';

import { useState } from 'react';
import { updateSettings } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsForm({ initialData }: { initialData: any }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    
    const formData = new FormData(e.currentTarget);
    
    const data = {
      shift_start: formData.get('shift_start') as string,
      shift_end: formData.get('shift_end') as string,
      grace_until: formData.get('grace_until') as string,
      half_day_if_in_after: formData.get('half_day_if_in_after') as string,
      half_day_if_out_before: formData.get('half_day_if_out_before') as string,
      late_strike_window: (formData.get('late_strike_window') as string).split(',').map(s => s.trim()),
      early_strike_window: (formData.get('early_strike_window') as string).split(',').map(s => s.trim()),
      strikes_per_penalty: Number(formData.get('strikes_per_penalty')),
      penalty_days_per_trigger: Number(formData.get('penalty_days_per_trigger')),
      sandwich_skips_weekly_off: formData.get('sandwich_skips_weekly_off') === 'on'
    };

    await updateSettings(data);
    
    setSuccess(true);
    setLoading(false);
    
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>Shift Timings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shift_start">Shift Start (HH:mm)</Label>
            <Input id="shift_start" name="shift_start" defaultValue={initialData.shift_start} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift_end">Shift End (HH:mm)</Label>
            <Input id="shift_end" name="shift_end" defaultValue={initialData.shift_end} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grace_until">Grace Until (HH:mm)</Label>
            <Input id="grace_until" name="grace_until" defaultValue={initialData.grace_until} required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Half Day Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="half_day_if_in_after">Half Day if In After (HH:mm)</Label>
            <Input id="half_day_if_in_after" name="half_day_if_in_after" defaultValue={initialData.half_day_if_in_after} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="half_day_if_out_before">Half Day if Out Before (HH:mm)</Label>
            <Input id="half_day_if_out_before" name="half_day_if_out_before" defaultValue={initialData.half_day_if_out_before} required />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penalties & Late Strikes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="late_strike_window">Late Strike Window (HH:mm, HH:mm)</Label>
            <Input id="late_strike_window" name="late_strike_window" defaultValue={initialData.late_strike_window?.join(', ')} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="early_strike_window">Early Strike Window (HH:mm, HH:mm)</Label>
            <Input id="early_strike_window" name="early_strike_window" defaultValue={initialData.early_strike_window?.join(', ')} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strikes_per_penalty">Strikes Per Penalty</Label>
            <Input id="strikes_per_penalty" name="strikes_per_penalty" type="number" defaultValue={initialData.strikes_per_penalty} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="penalty_days_per_trigger">Penalty Days Per Trigger</Label>
            <Input id="penalty_days_per_trigger" name="penalty_days_per_trigger" type="number" step="0.5" defaultValue={initialData.penalty_days_per_trigger} required />
          </div>
          <div className="col-span-1 md:col-span-2 flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="sandwich_skips_weekly_off" 
              name="sandwich_skips_weekly_off" 
              defaultChecked={initialData.sandwich_skips_weekly_off}
              className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900" 
            />
            <Label htmlFor="sandwich_skips_weekly_off">Sandwich Skips Weekly Off</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
        {success && <span className="text-sm font-medium text-green-600">Settings updated successfully!</span>}
      </div>
    </form>
  );
}
