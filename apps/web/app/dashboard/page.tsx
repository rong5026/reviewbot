'use client';
import { useEffect, useState } from 'react';
import ReviewCard from '../../components/ReviewCard';

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
    : 'http://localhost:3001';

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

interface Stats {
  reviewsThisMonth: number;
  limit: number | null;
  planTier: string;
}

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('reviewbot_token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_URL}/api/reviews`, { headers }).then((r) => r.json()),
      fetch(`${API_URL}/api/reviews/stats`, { headers }).then((r) => r.json()),
    ])
      .then(([reviewsData, statsData]) => {
        setReviews(reviewsData.reviews ?? []);
        setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-slate-400">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats bar */}
      {stats && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">Reviews this month</div>
            <div className="text-3xl font-bold text-slate-900">
              {stats.reviewsThisMonth}
              {stats.limit !== null && (
                <span className="text-lg text-slate-400 font-normal"> / {stats.limit}</span>
              )}
            </div>
          </div>
          <div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                stats.planTier === 'free'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {stats.planTier.charAt(0).toUpperCase() + stats.planTier.slice(1)} Plan
            </span>
          </div>
          {stats.planTier === 'free' && (
            <a
              href="/billing"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Upgrade to Pro
            </a>
          )}
        </div>
      )}

      {/* Review list */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Reviews</h2>
      {reviews.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">👋</div>
          <h3 className="font-semibold text-slate-900 mb-1">No reviews yet</h3>
          <p className="text-slate-500 text-sm">
            Open a PR in a repo where ReviewBot is installed and a review will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
