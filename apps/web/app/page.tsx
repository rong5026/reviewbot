import Link from 'next/link';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="font-bold text-lg text-slate-900">ReviewBot</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-slate-600 hover:text-slate-900 text-sm">
            Pricing
          </Link>
          <Link href="/docs" className="text-slate-600 hover:text-slate-900 text-sm">
            Docs
          </Link>
          <a
            href={`${API_URL}/api/auth/github`}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Sign in with GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          Powered by Claude Sonnet
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          AI code reviews in{' '}
          <span className="text-blue-600">60 seconds</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto">
          ReviewBot automatically reviews every GitHub PR — catching security vulnerabilities,
          logic bugs, and code quality issues before they reach production.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={`${API_URL}/api/auth/github`}
            className="bg-blue-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
          >
            Install on GitHub — Free
          </a>
          <Link
            href="/pricing"
            className="text-slate-700 px-8 py-3.5 rounded-xl text-base font-semibold border border-slate-200 hover:border-slate-300 transition-colors"
          >
            See pricing
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">Free tier: 3 repos, 10 reviews/month. No credit card required.</p>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '🛡️',
              title: 'Security First',
              desc: 'Catches SQL injection, XSS, exposed secrets, and auth bypasses automatically.',
            },
            {
              icon: '🐛',
              title: 'Logic Bugs',
              desc: 'Spots off-by-ones, null dereferences, and race conditions before they ship.',
            },
            {
              icon: '⚡',
              title: 'Under 60 Seconds',
              desc: 'Review posted as a PR comment with inline annotations before your team wakes up.',
            },
            {
              icon: '📊',
              title: 'Risk Score',
              desc: 'Every PR gets a Low / Medium / High / Critical risk score at a glance.',
            },
            {
              icon: '🔗',
              title: 'GitHub Native',
              desc: 'Installs as a GitHub App in 30 seconds. No CI changes, no config files.',
            },
            {
              icon: '💰',
              title: '37% Cheaper',
              desc: '$15/developer vs $24–30 for alternatives. Same frontier model.',
            },
          ].map((f) => (
            <div key={f.title} className="p-6 border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-16" id="pricing">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Simple pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Free',
              price: '$0',
              period: 'forever',
              features: ['3 repos', '10 reviews/month', 'PR summary comments', 'Risk scoring'],
              cta: 'Get started',
              href: `${API_URL}/api/auth/github`,
              highlight: false,
            },
            {
              name: 'Pro',
              price: '$15',
              period: 'per developer/month',
              features: ['Unlimited repos', 'Unlimited reviews', 'Inline comments', 'Priority support'],
              cta: 'Start free trial',
              href: '/billing?plan=pro',
              highlight: true,
            },
            {
              name: 'Team',
              price: '$12',
              period: 'per seat/month (5+)',
              features: ['Everything in Pro', 'Team dashboard', 'Audit log', 'SSO (coming soon)'],
              cta: 'Contact us',
              href: 'mailto:hello@reviewbot.app',
              highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`p-8 rounded-2xl border-2 ${
                plan.highlight
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <div className="text-sm font-semibold text-slate-500 mb-1">{plan.name}</div>
              <div className="text-4xl font-bold text-slate-900">{plan.price}</div>
              <div className="text-slate-400 text-sm mb-6">{plan.period}</div>
              <ul className="space-y-2 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                className={`block text-center py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        <p>© 2026 ReviewBot. Built with ❤️ using Claude.</p>
      </footer>
    </div>
  );
}
