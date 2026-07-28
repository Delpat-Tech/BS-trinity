'use client';

import { useState } from 'react';
import { uploadBiometrics, checkExceptions, bulkMarkPresentByDate } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PeriodHubClient({ periodId, isLocked }: { periodId: string, isLocked: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  const [checkingExceptions, setCheckingExceptions] = useState(false);
  const [exceptionResult, setExceptionResult] = useState<any>(null);

  const [bulkDate, setBulkDate] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState('');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadBiometrics(periodId, formData);
      setSuccess(res);
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckExceptions = async () => {
    setCheckingExceptions(true);
    setError('');
    setExceptionResult(null);
    try {
      const res = await checkExceptions(periodId);
      setExceptionResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to check exceptions');
    } finally {
      setCheckingExceptions(false);
    }
  };

  const handleBulkMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkDate) return;
    setBulkLoading(true);
    setBulkSuccess('');
    setError('');
    
    try {
      const res = await bulkMarkPresentByDate(periodId, bulkDate, bulkReason);
      setBulkSuccess(`Marked ${res.count} absentee/exception records as Present for ${bulkDate}`);
      setBulkDate('');
      setBulkReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to apply mass override');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Period Hub {isLocked && <span className="ml-2 text-sm font-semibold bg-red-100 text-red-800 px-2 py-1 rounded-full align-middle">LOCKED</span>}
        </h1>
        <p className="text-slate-500">
          Upload biometrics, resolve exceptions, and generate payroll.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload Biometric Data</CardTitle>
            <CardDescription>
              Upload the .xls export from the biometric machine for this period. 
              Uploading a new file will completely replace any existing attendance data for this period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="file" className="mb-2 block">Biometric File (.xls)</Label>
                <Input 
                  id="file"
                  type="file" 
                  accept=".xls,.xlsx" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={loading || isLocked}
                  required 
                />
              </div>
              <Button type="submit" disabled={!file || loading || isLocked} className="w-full">
                {loading ? 'Processing...' : 'Upload & Process'}
              </Button>
            </form>

            {success && (
              <div className="mt-6 space-y-4">
                <div className="p-4 text-sm text-green-800 bg-green-50 rounded-md border border-green-200">
                  Successfully imported {success.recordsCreated} attendance records.
                </div>
                
                {success.unmappedCodes?.length > 0 && (
                  <div className="p-4 text-sm text-amber-800 bg-amber-50 rounded-md border border-amber-200">
                    <p className="font-semibold mb-1">Unmapped Machine IDs (No Employee Found)</p>
                    <p>The following IDs were in the file but do not map to any active employee in the database:</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {success.unmappedCodes.map((code: number) => (
                        <span key={code} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-mono">{code}</span>
                      ))}
                    </div>
                  </div>
                )}

                {success.missingEmployees?.length > 0 && (
                  <div className="p-4 text-sm text-amber-800 bg-amber-50 rounded-md border border-amber-200">
                    <p className="font-semibold mb-1">Missing Employees</p>
                    <p>The following active employees were not found in the uploaded file:</p>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      {success.missingEmployees.map((emp: any) => (
                        <li key={emp.machineId}>{emp.name} (ID: {emp.machineId})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>2. Exception Generation</CardTitle>
              <CardDescription>
                Run the payroll engine across all attendance data to identify days with missing punches or conflicting statuses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCheckExceptions} disabled={checkingExceptions || isLocked} className="w-full">
                {checkingExceptions ? 'Running engine...' : 'Check for Exceptions'}
              </Button>
              
              {error && (
                <div className="mt-4 p-4 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              {exceptionResult && (
                <div className="mt-4 p-4 text-sm bg-slate-50 border rounded-md">
                  <p className="font-medium text-lg text-slate-800 mb-2">Engine Result</p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-white font-bold ${exceptionResult.count === 0 ? 'bg-green-600' : 'bg-red-500'}`}>
                      {exceptionResult.count}
                    </span>
                    <span className="text-slate-600">Exceptions Found</span>
                  </div>
                  {exceptionResult.count > 0 && (
                    <div className="mt-3">
                      <p className="text-slate-500 text-xs italic mb-2">
                        Go to the Resolution Queue to clear these exceptions before generating the final grid.
                      </p>
                      <Button variant="outline" className="w-full" onClick={() => window.location.href = `/period/${periodId}/queue`} disabled={isLocked}>
                        Open Resolution Queue
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Mass Override (Bulk Mark Present)</CardTitle>
              <CardDescription>
                Mark all absences and exceptions as Present for a specific date (e.g. Workshop Shut, Outage). This never overrides real punches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkMark} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkDate">Date</Label>
                  <Input 
                    id="bulkDate" 
                    type="date" 
                    value={bulkDate} 
                    onChange={e => setBulkDate(e.target.value)}
                    disabled={bulkLoading || isLocked}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkReason">Reason</Label>
                  <Input 
                    id="bulkReason"
                    type="text" 
                    placeholder="e.g. Workshop Shut"
                    value={bulkReason}
                    onChange={e => setBulkReason(e.target.value)}
                    disabled={bulkLoading || isLocked}
                    required
                  />
                </div>
                <Button type="submit" disabled={!bulkDate || !bulkReason || bulkLoading || isLocked} className="w-full">
                  {bulkLoading ? 'Applying...' : 'Apply Mass Override'}
                </Button>
              </form>

              {bulkSuccess && (
                <div className="mt-4 p-4 text-sm text-green-800 bg-green-50 rounded-md border border-green-200">
                  {bulkSuccess}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <div className="mt-8 pt-8 border-t flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Ready for Final Review?</h2>
          <p className="text-slate-500 text-sm">Once all exceptions are clear, head to the Review Grid.</p>
        </div>
        <Button size="lg" onClick={() => window.location.href = `/period/${periodId}/review`}>
          Open Review Grid
        </Button>
      </div>
      <div className="mt-8 pt-8 border-t">
        <h2 className="text-xl font-bold mb-4">4. Final Output</h2>
        <Card>
          <CardHeader>
            <CardTitle>Export Salary Sheet</CardTitle>
            <CardDescription>
              Download the finalized Excel file containing all payroll calculations. The period must be locked before exporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg" 
              onClick={() => window.location.href = `/api/export/${periodId}`} 
              disabled={!isLocked}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Download .xlsx
            </Button>
            {!isLocked && (
              <p className="text-sm text-slate-500 mt-2 text-center">
                Lock the period in the Review Grid to enable export.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
