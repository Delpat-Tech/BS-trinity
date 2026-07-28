'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { previewBiometricFile } from './actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ParsedDay } from '@/lib/parser/biometric';

export default function BiometricImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<ParsedDay[]>([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 100;

  const [month, setMonth] = useState('6'); // Default to June
  const [year, setYear] = useState('2026'); // Default to 2026

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setRecords([]);
    setPage(1);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', month);
    formData.append('year', year);

    try {
      const res = await previewBiometricFile(formData);
      if (res.success && res.records) {
        setRecords(res.records);
      } else {
        setError(res.error || 'Failed to parse file');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };

  const paginatedRecords = records.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(records.length / rowsPerPage);

  const stats = records.length > 0 ? {
    totalRecords: records.length,
    employees: new Set(records.map(r => r.machineId)).size,
    absents: records.filter(r => r.machineStatus === 'A').length,
    presents: records.filter(r => r.machineStatus === 'P').length,
    wop: records.filter(r => r.machineStatus === 'WOP').length,
    wo: records.filter(r => r.machineStatus === 'WO').length,
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Import Biometric Data</h1>
        <p className="text-slate-500">
          Upload the monthly `.xls` export from the biometric device to preview the raw parsed data.
        </p>
      </div>

      <div className="p-6 border rounded-lg bg-white shadow-sm max-w-xl">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Month</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={month} 
                onChange={e => setMonth(e.target.value)}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Year</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={year} 
                onChange={e => setYear(e.target.value)}
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Biometric Export File (.xls)</label>
            <Input 
              type="file" 
              accept=".xls,.xlsx" 
              onChange={handleFileChange} 
              disabled={loading}
              required 
            />
          </div>
          <Button type="submit" disabled={!file || loading} className="w-full">
            {loading ? 'Parsing File...' : 'Upload & Preview'}
          </Button>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </form>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <p className="text-sm text-slate-500">Total Employees</p>
            <p className="text-2xl font-bold">{stats.employees}</p>
          </div>
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <p className="text-sm text-slate-500">Total Records</p>
            <p className="text-2xl font-bold">{stats.totalRecords}</p>
          </div>
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <p className="text-sm text-slate-500">Total Presents (P)</p>
            <p className="text-2xl font-bold text-green-600">{stats.presents}</p>
          </div>
          <div className="p-4 border rounded-lg bg-white shadow-sm">
            <p className="text-sm text-slate-500">Total Absents (A)</p>
            <p className="text-2xl font-bold text-red-600">{stats.absents}</p>
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div className="space-y-4">
          <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[100px]">Mach ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In Time</TableHead>
                  <TableHead>Out Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.map((rec, i) => (
                  <TableRow key={`${rec.machineId}-${rec.date}-${i}`}>
                    <TableCell className="font-medium text-slate-900">{rec.machineId}</TableCell>
                    <TableCell>{rec.date}</TableCell>
                    <TableCell>{rec.inTime || '-'}</TableCell>
                    <TableCell>{rec.outTime || '-'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                        ${rec.machineStatus === 'P' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' : ''}
                        ${rec.machineStatus === 'A' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20' : ''}
                        ${rec.machineStatus === 'WO' ? 'bg-slate-100 text-slate-700' : ''}
                        ${rec.machineStatus === 'WOP' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20' : ''}
                      `}>
                        {rec.machineStatus}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, records.length)} of {records.length} entries
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
