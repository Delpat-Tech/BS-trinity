'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadBiometrics } from './actions';

export default function PeriodHubClient({ periodId, isLocked, hasBiometrics }: { periodId: string, isLocked: boolean, hasBiometrics: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [forceShowUpload, setForceShowUpload] = useState(false);
  const router = useRouter();

  const showUploadForm = !hasBiometrics || forceShowUpload;

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
      // Wait a moment then refresh to show next steps if needed, or user can navigate to Resolve
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  if (!showUploadForm) {
    return (
      <div className="px-[28px] py-[16px] border-b border-border-subtle bg-header flex items-center gap-[38px]">
        <div>
          <div className="text-[11.5px] text-text-secondary">File status</div>
          <div className="font-mono text-[13px] mt-[2px]">Data successfully processed</div>
        </div>
        <button 
          onClick={() => setForceShowUpload(true)} 
          disabled={isLocked}
          className="ml-auto bg-surface text-text border border-border-strong rounded-[4px] px-[11px] py-[6px] text-[12.5px] cursor-pointer hover:bg-hover disabled:opacity-50"
        >
          Replace file
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="p-[28px] max-w-4xl">
        <h2 className="m-0 text-[14px] font-semibold">Upload Biometrics</h2>
        <div className="text-[13px] text-text-secondary mt-[4px] mb-[16px]">
          Upload the .xls export from the biometric machine for this period. 
          Uploading a new file will replace existing attendance data.
        </div>
        
        <form onSubmit={handleUpload} className="flex flex-col gap-[16px] max-w-md">
          <div className="border border-dashed border-border-strong rounded-[4px] p-[24px] flex flex-col items-center justify-center relative bg-header hover:bg-hover transition-colors">
            <input 
              id="file"
              type="file" 
              accept=".xls,.xlsx" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading || isLocked}
              required 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-[13px] font-medium text-text-secondary">
              {file ? file.name : "Click or drag biometric .xls file here"}
            </div>
          </div>

          {error && (
            <div className="bg-alert-bg text-alert-text border border-alert-border p-[12px] rounded-[4px] text-[13px]">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success-bg text-success-text border border-success-border p-[12px] rounded-[4px] text-[13px] whitespace-pre-line">
              {success.message}
            </div>
          )}

          <div className="flex gap-[12px]">
            <button 
              type="submit" 
              disabled={!file || loading || isLocked}
              className="bg-text text-surface border border-text rounded-[4px] px-[13px] py-[7px] text-[12.5px] font-medium cursor-pointer hover:bg-[#332F2A] disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload Data'}
            </button>
            {hasBiometrics && (
              <button 
                type="button" 
                onClick={() => setForceShowUpload(false)}
                className="bg-transparent text-text border border-border-strong rounded-[4px] px-[13px] py-[7px] text-[12.5px] font-medium cursor-pointer hover:bg-hover"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
