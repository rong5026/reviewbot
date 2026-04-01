import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReviewBot — AI Code Review for GitHub',
  description:
    'ReviewBot automatically reviews every GitHub PR using Claude — catching security issues, bugs, and code quality problems in under 60 seconds.',
  openGraph: {
    title: 'ReviewBot — AI Code Review for GitHub',
    description: 'AI-powered PR reviews in under 60 seconds. Powered by Claude.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
