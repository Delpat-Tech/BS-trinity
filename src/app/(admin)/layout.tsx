import { requireSession } from '@/lib/auth';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="container flex h-16 items-center justify-between py-4 mx-auto px-4">
          <div className="flex gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="inline-block font-bold">Trinity Motors</span>
            </Link>
            <nav className="flex gap-6">
              <Link
                href="/"
                className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/employees"
                className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Employees
              </Link>
              <Link
                href="/import"
                className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Import
              </Link>
              <Link
                href="/settings"
                className="flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600 border-r pr-4 border-slate-200">
              Welcome, {session.user?.name}
            </span>
            <a href="/api/auth/signout" className="text-sm font-medium text-red-600 hover:text-red-700">
              Log out
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 py-8">
        {children}
      </main>
    </div>
  );
}
