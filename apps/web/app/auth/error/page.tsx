import Link from 'next/link';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-slate-900">Authentication failed</h1>
      <p className="text-slate-500">Something went wrong during sign-in. Please try again.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
