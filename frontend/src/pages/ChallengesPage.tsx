import SEO, { SITE_URL } from "../components/SEO";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { listChallenges, PaginatedChallengeList, ApiError } from "../lib/api";
import { trackChallengeFilter, trackChallengeSearch } from "../lib/analytics";

const CHALLENGES_BREADCRUMB = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${SITE_URL}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Challenges",
      item: `${SITE_URL}/challenges`,
    },
  ],
};

const DIFFICULTIES = ["", "Easy", "Medium", "Hard"] as const;

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
  Medium: "text-amber-400 bg-amber-950/60 border-amber-800",
  Hard: "text-rose-400 bg-rose-950/60 border-rose-800",
};

export const ChallengesPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedChallengeList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listChallenges({
        search: search.trim() || undefined,
        difficulty: difficulty || undefined,
        page,
        page_size: 20,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load challenges.");
    } finally {
      setLoading(false);
    }
  }, [search, difficulty, page]);

  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // Reset to page 1 when filters change
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }
    if (v.trim()) {
      searchTimerRef.current = window.setTimeout(() => {
        trackChallengeSearch(v);
      }, 600);
    }
  };
  const handleDifficulty = (v: string) => {
    setDifficulty(v);
    setPage(1);
    trackChallengeFilter(v);
  };

  return (
    <>
      <SEO
        title="Coding Challenges for Beginners"
        description="Explore programming challenges on LevelUp. Browse coding problems by difficulty, practise problem-solving and improve your programming skills."
        path="/challenges"
        structuredData={CHALLENGES_BREADCRUMB}
      />

      <div className="max-w-3xl mx-auto w-full space-y-6 min-h-[75vh]">
        <div>
          <h1 className="text-2xl font-bold text-white">Challenges</h1>
          <p className="text-sm text-slate-400 mt-0.5">Browse and solve coding problems at your level.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            aria-label="Search challenges"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          <select
            aria-label="Filter by difficulty"
            value={difficulty}
            onChange={(e) => handleDifficulty(e.target.value)}
            className="px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d || "All Difficulties"}</option>
            ))}
          </select>
        </div>

        {/* States */}
        {loading && (
          <div className="text-center py-12 text-slate-400 text-sm">Loading challenges…</div>
        )}
        {error && (
          <div role="alert" className="text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && data && data.items.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">
            No challenges found. Try adjusting your filters.
          </div>
        )}

        {/* Challenge list */}
        {!loading && !error && data && data.items.length > 0 && (
          <ul className="space-y-2">
            {data.items.map((ch) => (
              <li key={ch.id}>
                <Link
                  to={`/challenges/${ch.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-700 hover:bg-slate-900/80 transition group"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition">
                      {ch.title}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">{ch.topic}</span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[ch.difficulty] ?? "text-slate-400 bg-slate-800 border-slate-700"}`}
                  >
                    {ch.difficulty}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-400 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 transition"
            >
              ← Previous
            </button>
            <span>
              Page {data.page} of {data.total_pages} ({data.total} challenges)
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page === data.total_pages}
              className="px-3 py-2.5 min-h-[44px] rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 transition"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
};
