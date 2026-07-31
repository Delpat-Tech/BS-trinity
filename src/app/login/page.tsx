'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { InteractiveWaterBackdrop } from '@/components/visual/InteractiveWaterBackdrop';
import { getCompanySettings } from './actions';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function LoginPage() {
  const router = useRouter();
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [appSettings, setAppSettings] = useState<any>(null);

  useEffect(() => {
    getCompanySettings().then(setAppSettings).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setLoginError('Both username and password are required');
      return;
    }
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        username: loginUsername,
        password: loginPassword,
      });

      if (res?.error) {
        setLoginError('Invalid username or password');
      } else {
        router.push('/');
      }
    } catch (err) {
      setLoginError('Error connecting to authentication server');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div 
      id="login-page-container" 
      className={`fixed inset-0 bg-slate-100 flex flex-col justify-between p-4 sm:p-5 overflow-hidden ${inter.className}`}
    >
      <style>{`
        #login-page-container input[type="text"],
        #login-page-container input[type="password"] {
          background-color: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          height: 2.5rem !important;
          padding: 0.5rem 0 !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
          color: #0f172a !important;
          outline: none !important;
          box-shadow: none !important;
          width: 100% !important;
        }
      `}</style>

      {/* Interactive Water Backdrop */}
      <InteractiveWaterBackdrop theme="light" className="opacity-60" />

      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-orange-50/60 via-white/30 to-slate-100/80" />

      {/* Top Workspace Header */}
      <header className="relative z-10 mx-auto w-full max-w-5xl pt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {appSettings?.logoUrl ? (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
                <img
                  src={appSettings.logoUrl}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-[#E8630A] text-2xl font-bold text-white shadow-md">
                T
              </div>
            )}

            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">
                {appSettings?.companyName || "TRINITY MOTORS"}
              </h1>
              <p className="text-xs text-slate-500 max-w-xl font-medium">
                {appSettings?.tagline || "Garage System — Securely access your payroll & attendance dashboard."}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Center Card */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-[#E8630A] text-[10px] font-bold uppercase tracking-widest mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Welcome Back</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Sign in to continue</h2>
          </div>

          {loginError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-600 flex items-center gap-2">
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Username
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-250 bg-slate-50 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500 focus-within:bg-white transition-all px-3">
                <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  disabled={isLoggingIn}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-250 bg-slate-50 focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500 focus-within:bg-white transition-all px-3">
                <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoggingIn}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex-shrink-0"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-[#E8630A] hover:from-orange-500 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 text-xs cursor-pointer transition-all duration-200 uppercase tracking-widest mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-3 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-1.5">
            <span>Powered by</span>
            <span className="font-bold text-slate-600 tracking-wide">BrahmaSuite</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] text-slate-400 font-medium py-2">
        © {new Date().getFullYear()} BrahmaSuite. All rights reserved.
      </footer>
    </div>
  );
}
