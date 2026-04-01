'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('reviewbot_token', token);
      router.replace('/dashboard');
    } else {
      router.replace('/auth/error');
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
