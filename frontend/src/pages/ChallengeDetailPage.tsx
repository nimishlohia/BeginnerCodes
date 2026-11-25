import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getChallenge,
  submitCode,
  getSubmission,
  ChallengeDetail,
  SubmissionDetail,
  ApiError,
} from "../lib/api";

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-400 bg-emerald-950/60 border-emerald-800",
  Medium: "text-amber-400 bg-amber-950/60 border-amber-800",
  Hard: "text-rose-400 bg-rose-950/60 border-rose-800",
};

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "text-emerald-400",
  WRONG_ANSWER: "text-rose-400",
  COMPILATION_ERROR: "text-amber-400",
  RUNTIME_ERROR: "text-rose-400",
  TIME_LIMIT_EXCEEDED: "text-amber-400",
  EVALUATION_ERROR: "text-slate-400",
  PENDING: "text-slate-400",
  RUNNING: "text-sky-400",
};

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
      {code}
    </pre>
  );
}

export const ChallengeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [language, setLanguage] = useState("python");
  const [sourceCode, setSourceCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<SubmissionDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    getChallenge(Number(id))
      .then((c) => {
        setChallenge(c);
        if (c.supported_languages.length > 0) setLanguage(c.supported_languages[0]);
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Failed to load challenge.");
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !challenge) return;
    setSubmitting(true);
    setSubmitError(null);
    setLatestSubmission(null);
    try {
      const status = await submitCode(challenge.id, { language, source_code: sourceCode }, token);
      // Fetch full detail so we have result_summary
      const detail = await getSubmission(status.id, token);
      setLatestSubmission(detail);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-rose-400 text-sm">{loadError}</p>
      </div>
    );
  }

  if (!challenge) {
    return <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">{challenge.title}</h1>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[challenge.difficulty] ?? "text-slate-400 bg-slate-800 border-slate-700"}`}
          >
            {challenge.difficulty}
          </span>
          <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">
            {challenge.topic}
          </span>
        </div>
      </div>

      {/* Description */}
      <section className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Problem</h2>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{challenge.description}</p>
      </section>

      {/* Input / Output / Constraints */}
      {(challenge.input_format || challenge.output_format || challenge.constraints) && (
        <section className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          {challenge.input_format && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Input Format</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{challenge.input_format}</p>
            </div>
          )}
          {challenge.output_format && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Output Format</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{challenge.output_format}</p>
            </div>
          )}
          {challenge.constraints && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Constraints</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono text-xs">{challenge.constraints}</p>
            </div>
          )}
        </section>
      )}

      {/* Examples */}
      {challenge.examples.length > 0 && (
        <section className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Examples</h2>
          {challenge.examples.map((ex, i) => (
            <div key={ex.id} className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">Example {i + 1}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Input</p>
                  <CodeBlock code={ex.input_data} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Output</p>
                  <CodeBlock code={ex.expected_output} />
                </div>
              </div>
              {ex.explanation && (
                <p className="text-xs text-slate-400 italic">{ex.explanation}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Code Editor */}
      <section className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Solution</h2>

        {!isAuthenticated && (
          <p className="text-sm text-slate-400">
            <button
              onClick={() => navigate("/login")}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              Sign in
            </button>{" "}
            to submit a solution.
          </p>
        )}

        {isAuthenticated && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Language selector */}
            <div>
              <label htmlFor="language" className="block text-xs font-medium text-slate-300 mb-1">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                {challenge.supported_languages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Code textarea */}
            <div>
              <label htmlFor="sourceCode" className="block text-xs font-medium text-slate-300 mb-1">
                Source Code
              </label>
              <textarea
                id="sourceCode"
                rows={12}
                required
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                spellCheck={false}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-y"
                placeholder={`# Write your ${language} solution here…`}
              />
            </div>

            {submitError && (
              <p role="alert" className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Solution"}
            </button>
          </form>
        )}
      </section>

      {/* Submission Result */}
      {latestSubmission && (
        <section className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Submission Result
          </h2>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold ${STATUS_COLORS[latestSubmission.status] ?? "text-slate-300"}`}>
              {latestSubmission.status.replace(/_/g, " ")}
            </span>
            {latestSubmission.execution_time_ms !== null && (
              <span className="text-xs text-slate-500">{latestSubmission.execution_time_ms}ms</span>
            )}
          </div>
          {latestSubmission.result_summary && (
            <p className="text-xs text-slate-400 bg-slate-950/60 rounded-lg px-3 py-2 leading-relaxed border border-slate-800">
              {latestSubmission.result_summary}
            </p>
          )}
          <p className="text-xs text-amber-600/80 border border-amber-900/40 bg-amber-950/20 rounded-lg px-3 py-2">
            ⚠ Evaluation is currently simulated. No code was executed. Results do not reflect actual correctness.
          </p>
        </section>
      )}
    </div>
  );
};
