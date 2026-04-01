'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [login, setLogin] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('reviewbot_token');
    if (!token) {
      router.replace('/');
      return;
    }
    // Fetch identity
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setLogin(data?.user?.githubLogin ?? null))
      .catch(() => router.replace('/'));
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="text-xl">🤖</span> ReviewBot
        </Link>
        <div className="flex items-center gap-4">
          {login && <span className="text-sm text-slate-500">@{login}</span>}
          <button
            onClick={() => {
              localStorage.removeItem('reviewbot_token');
              router.replace('/');
            }}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
