'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadBiometrics, previewBiometrics } from './actions';
import { UploadCloud, CheckCircle2, FileSpreadsheet, Loader2, AlertCircle, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

import { toast } from 'sonner';

export default function PeriodHubClient({ 
  periodId, 
  isLocked, 
  hasBiometrics,
  existingPreviewData
}: { 
  periodId: string, 
  isLocked: boolean, 
  hasBiometrics: boolean,
  existingPreviewData?: any
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [forceShowUpload, setForceShowUpload] = useState(false);
  
  const [previewData, setPreviewData] = useState<any>(existingPreviewData || null);
  
  const router = useRouter();

  const showUploadForm = !hasBiometrics || forceShowUpload;

  const handlePreview = async (selectedFile: File) => {
    setLoading(true);
    setLoadingStep(`Parsing ${selectedFile.name}...`);
    setError('');
    setFile(selectedFile);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await previewBiometrics(periodId, formData);
      if (res && res.error) throw new Error(res.error);
      setPreviewData(res);
      toast.success('Excel file parsed successfully. Review preview below.');
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during preview.';
      setError(errMsg);
      toast.error(errMsg);
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!file) return;

    setLoading(true);
    setLoadingStep(`Processing and saving ${file.name} to database...`);
    setError('');

    try {
      const res = await uploadBiometrics(periodId, previewData.importId);
      if (res && res.error) throw new Error(res.error);
      toast.success('Biometrics uploaded and processed successfully.');
      // Let's redirect to step 2 after successful upload
      router.push(`/period/${periodId}/queue`);
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during final upload.';
      setError(errMsg);
      toast.error(errMsg);
      setLoading(false);
    }
  };

  const FileDropzone = () => (
    <div className="relative group cursor-pointer">
      <input 
        id="file"
        type="file" 
        accept=".xls,.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" 
        onChange={(e) => {
          if (e.target.files?.[0]) handlePreview(e.target.files[0]);
        }}
        disabled={loading || isLocked}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className={cn(
        "flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all duration-200",
        "bg-surface hover:bg-hover hover:border-border-strong border-border-subtle group-hover:shadow-sm"
      )}>
        <div className="w-16 h-16 rounded-full bg-header flex items-center justify-center mb-6 shadow-sm border border-border-subtle group-hover:scale-105 transition-transform duration-300">
          <UploadCloud className="w-8 h-8 text-text-muted group-hover:text-text transition-colors" />
        </div>
        <h3 className="text-lg font-semibold text-text mb-2">Upload Biometric Data</h3>
        <p className="text-sm text-text-muted text-center max-w-sm mb-6">
          Drag and drop your machine's <span className="font-mono text-[13px] bg-header px-1 py-0.5 rounded border border-border">.xls</span> export file here, or click to browse.
        </p>
        <div className="flex items-center gap-2 text-xs font-medium text-text-muted bg-header px-3 py-1.5 rounded-full border border-border-subtle">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Supported format: strict machine .xls
        </div>
      </div>
    </div>
  );

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-border bg-surface shadow-sm">
      <Loader2 className="w-10 h-10 text-text animate-spin mb-6" />
      <h3 className="text-base font-semibold text-text mb-2">Processing Data</h3>
      <p className="text-sm text-text-muted">{loadingStep}</p>
    </div>
  );

  const PreviewTable = ({ data, isAlreadySaved }: { data: any, isAlreadySaved: boolean }) => (
    <div className="flex flex-col w-full bg-surface border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="p-6 border-b border-border bg-header flex items-start justify-between">
        <div className="flex gap-4">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border",
            isAlreadySaved ? "bg-success-bg border-success-border text-success-text" : "bg-surface border-border shadow-sm text-text"
          )}>
            {isAlreadySaved ? <CheckCircle2 className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text mb-1">
              {isAlreadySaved ? "Data Successfully Processed" : "Review Data"}
            </h2>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <span className="flex items-center gap-1.5"><FileSpreadsheet className="w-4 h-4" /> {data.fileName}</span>
              <span className="w-1 h-1 rounded-full bg-border-strong" />
              <span>{data.totalRecords} records found</span>
            </div>
          </div>
        </div>

        {isAlreadySaved && !isLocked && (
          <button 
            onClick={() => { setForceShowUpload(true); setPreviewData(null); }}
            className="text-sm font-medium text-text-muted hover:text-text px-4 py-2 bg-surface border border-border rounded-lg shadow-sm hover:bg-hover transition-colors"
          >
            Replace File
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-text-muted bg-surface border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">Employee</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
              <th className="px-6 py-4 font-semibold tracking-wider">In Time</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Out Time</th>
              <th className="px-6 py-4 font-semibold tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {data.preview.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-hover transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex flex-col">
                    <span className="font-semibold text-text">{row.name || 'Unknown Employee'}</span>
                    <span className="font-mono text-[11px] text-text-muted mt-0.5">ID: {row.machineId}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-text">{row.date}</td>
                <td className="px-6 py-3.5 text-text-secondary">{row.inTime || '-'}</td>
                <td className="px-6 py-3.5 text-text-secondary">{row.outTime || '-'}</td>
                <td className="px-6 py-3.5 text-right">
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border",
                    row.status === 'P' ? "bg-success-bg/50 border-success-border text-[#127a4b]" : 
                    row.status === 'A' ? "bg-alert-bg border-alert-border text-alert-text" : 
                    "bg-header border-border-strong text-text-muted"
                  )}>
                    {row.status === 'P' ? 'Present' : row.status === 'A' ? 'Absent' : row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer message indicating it's just a sample */}
      <div className="bg-header px-6 py-3 border-t border-border text-xs text-text-muted text-center italic">
        Showing first 5 rows of {data.totalRecords} imported rows.
      </div>
      
      {/* Notice Lists */}
      {(!isAlreadySaved && ((data.unmappedCodes?.length > 0) || (data.missingActive?.length > 0))) && (
        <div className="p-6 bg-amber-500/10 border-t border-amber-500/20 text-amber-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Please note the following before proceeding:
          </h3>
          
          <div className="grid grid-cols-2 gap-8">
            {data.unmappedCodes?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-amber-800">New Machine Codes</h4>
                <p className="text-xs text-amber-700/80 mb-3">These codes don't exist in the database. They will be auto-created as "Employee #ID". You can update their details later.</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                  {data.unmappedCodes.map((code: number) => (
                    <span key={code} className="px-2 py-1 bg-amber-500/20 rounded font-mono text-xs">{code}</span>
                  ))}
                </div>
              </div>
            )}
            
            {data.missingActive?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-amber-800">Active Employees Missing from File</h4>
                <p className="text-xs text-amber-700/80 mb-3">These employees are active this month but have no data in the file. They will be marked as absent.</p>
                <div className="flex flex-col gap-1 max-h-40 overflow-auto">
                  {data.missingActive.map((emp: any) => (
                    <div key={emp.machineId} className="flex justify-between items-center text-xs bg-amber-500/20 px-2 py-1 rounded">
                      <span>{emp.name}</span>
                      <span className="font-mono opacity-70">#{emp.machineId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Action Footer for Preview Mode */}
      {!isAlreadySaved && (
        <div className="p-6 border-t border-border bg-surface flex items-center justify-between">
          <button 
            onClick={() => { setPreviewData(null); setFile(null); }}
            disabled={loading}
            className="text-sm font-medium text-text-muted hover:text-text px-4 py-2 hover:bg-header rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
            <button 
              onClick={handleConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#E8630A] text-white rounded-lg text-sm font-semibold hover:bg-[#C9540A] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm & Save Data
              <ChevronRight className="w-4 h-4" />
            </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center justify-start pt-12 pb-24 px-8 min-h-[600px] bg-surface">
      <div className="w-full max-w-4xl">
        
        {error && (
          <div className="mb-6 p-4 bg-alert-bg border-l-4 border-alert-border rounded-r-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-alert-text shrink-0 mt-0.5" />
            <div className="text-sm text-alert-text flex-1 whitespace-pre-wrap">{error}</div>
            <button onClick={() => setError('')} className="text-alert-text hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : previewData ? (
          <PreviewTable data={previewData} isAlreadySaved={!showUploadForm} />
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <FileDropzone />
          </div>
        )}
      </div>
    </div>
  );
}
