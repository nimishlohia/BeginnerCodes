import SEO from "../components/SEO";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listMySubmissions, getSubmission, PaginatedSubmissionList, SubmissionDetail, ApiError } from "../lib/api";

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
  WRONG_ANSWER: "text-rose-400 bg-rose-950/60 border-rose-800",
  COMPILATION_ERROR: "text-amber-400 bg-amber-950/60 border-amber-800",
  RUNTIME_ERROR: "text-rose-400 bg-rose-950/60 border-rose-800",
  TIME_LIMIT_EXCEEDED: "text-amber-400 bg-amber-950/60 border-amber-800",
  EVALUATION_ERROR: "text-slate-400 bg-slate-800 border-slate-700",
  PENDING: "text-slate-400 bg-slate-800 border-slate-700",
  RUNNING: "text-sky-400 bg-sky-950/60 border-sky-800",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const SubmissionsPage: React.FC = () => {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedSubmissionList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SubmissionDetail | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    listMySubmissions(token, { page })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load submissions."))
      .finally(() => setLoading(false));
  }, [token, page]);

  const openDetail = async (id: number) => {
    if (!token) return;
    try {
      const detail = await getSubmission(id, token);
      setSelected(detail);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <SEO
        title="My Submissions"
        description="View your personal coding challenge submission history and evaluation summaries on LevelUp."
        path="/submissions"
        noIndex
      />
      <div className="max-w-3xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Submissions</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your personal submission history.</p>
      </div>

      {loading && <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>}
      {error && (
        <div role="alert" className="text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && data?.items.length === 0 && (
        <div className="text-center py-12 text-slate-500 text-sm">
          You haven&apos;t submitted any solutions yet.{" "}
          <Link to="/challenges" className="text-emerald-400 hover:text-emerald-300 transition">
            Browse challenges
          </Link>
        </div>
      )}

      {/* Selected submission detail panel */}
      {selected && (
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Submission #{selected.id} Detail
            </h2>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Close ✕
            </button>
          </div>
          <div className="flex gap-3 flex-wrap text-xs text-slate-400">
            <span>Language: <span className="text-slate-200 font-medium">{selected.language}</span></span>
            <span>Status: <span className={`font-medium ${STATUS_COLORS[selected.status]?.split(" ")[0]}`}>{selected.status}</span></span>
            {selected.execution_time_ms !== null && (
              <span>Time: <span className="text-slate-200">{selected.execution_time_ms}ms</span></span>
            )}
          </div>
          {selected.result_summary && (
            <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
              {selected.result_summary}
            </p>
          )}
          <div>
            <p className="text-xs text-slate-500 mb-1">Your Code</p>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono max-h-60">
              {selected.source_code}
            </pre>
          </div>
          <p className="text-xs text-amber-600/80 border border-amber-900/40 bg-amber-950/20 rounded-lg px-3 py-2">
            ⚠ Evaluation is currently simulated. Results do not reflect actual code execution.
          </p>
        </div>
      )}

      {/* Submissions list */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <ul className="space-y-2">
            {data.items.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => openDetail(s.id)}
                  className="w-full text-left flex items-start justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{s.challenge_title}</p>
                    <p className="text-xs text-slate-500">{s.language} · {formatDate(s.created_at)}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[s.status] ?? "text-slate-400 bg-slate-800 border-slate-700"}`}
                  >
                    {s.status.replace(/_/g, " ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {data.total_pages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-400">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                ← Previous
              </button>
              <span>Page {data.page} of {data.total_pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
};
