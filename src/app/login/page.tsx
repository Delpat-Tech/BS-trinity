'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const res = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    if (res?.error) {
      setError('Invalid credentials');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl rounded-xl border border-slate-100">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Trinity Motors</h1>
          <p className="text-sm text-slate-500 mt-2">Sign in to the Payroll System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="username">
              Username
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              id="username"
              name="username"
              type="text"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none" htmlFor="password">
              Password
            </label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            className="inline-flex w-full items-center justify-center rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-900/90 h-10 px-4 py-2"
            type="submit"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
