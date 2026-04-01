import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="font-bold text-lg text-slate-900">ReviewBot</span>
        </Link>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Back</Link>
      </nav>
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Pricing</h1>
        <p className="text-slate-500 mb-12">Start free. Upgrade when you need more.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { name: 'Free', price: '$0', period: 'forever', features: ['3 repos', '10 reviews/month', 'PR summary', 'Risk scoring'], cta: 'Get started free', href: '/' },
            { name: 'Pro', price: '$15', period: '/developer/month', features: ['Unlimited repos', 'Unlimited reviews', 'Inline comments', 'Priority support'], cta: 'Start free trial', href: '/billing?plan=pro', highlight: true },
            { name: 'Team', price: '$12', period: '/seat/month (5+)', features: ['Everything in Pro', 'Team dashboard', 'Usage analytics', 'SSO (coming soon)'], cta: 'Contact sales', href: 'mailto:hello@reviewbot.app' },
          ].map((p) => (
            <div key={p.name} className={`rounded-2xl border-2 p-8 ${p.highlight ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}` }>
              <div className="text-sm font-semibold text-slate-400 mb-1">{p.name}</div>
              <div className="text-4xl font-bold text-slate-900">{p.price}<span className="text-base font-normal text-slate-400">{p.period}</span></div>
              <ul className="mt-6 mb-8 space-y-2">
                {p.features.map((f) => <li key={f} className="flex gap-2 text-sm text-slate-700"><span className="text-green-500">✓</span>{f}</li>)}
              </ul>
              <a href={p.href} className={`block text-center py-2.5 rounded-lg font-medium text-sm ${p.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-700'} transition-colors`}>{p.cta}</a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
