interface Review {
  id: string;
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  riskLevel: string | null;
  summary: string | null;
  inlineCommentCount: number;
  durationMs: number | null;
  createdAt: string;
}

const RISK_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-green-100', text: 'text-green-700', label: '🟢 Low' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '🟡 Medium' },
  high: { bg: 'bg-red-100', text: 'text-red-700', label: '🔴 High' },
  critical: { bg: 'bg-red-200', text: 'text-red-900', label: '💀 Critical' },
};

export default function ReviewCard({ review }: { review: Review }) {
  const risk = review.riskLevel ? RISK_STYLES[review.riskLevel] : null;
  const duration = review.durationMs ? `${(review.durationMs / 1000).toFixed(1)}s` : null;
  const date = new Date(review.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-slate-200 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400 font-mono">{review.repoFullName}#{review.prNumber}</span>
            {risk && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>
                {risk.label}
              </span>
            )}
          </div>
          <h3 className="font-medium text-slate-900 truncate">{review.prTitle}</h3>
          {review.summary && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{review.summary}</p>
          )}
        </div>
        <div className="text-right text-xs text-slate-400 shrink-0">
          <div>{date}</div>
          {duration && <div>{duration}</div>}
          {review.inlineCommentCount > 0 && (
            <div>{review.inlineCommentCount} comments</div>
          )}
        </div>
      </div>
    </div>
  );
}
