import React, { useEffect, useState } from "react";
import { checkBackendHealth, HealthResponse } from "../lib/api";

type BackendStatus = "checking" | "connected" | "unavailable";

export const HomePage: React.FC = () => {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHealth = async () => {
    setStatus("checking");
    setErrorMessage(null);
    try {
      const data = await checkBackendHealth();
      setHealthData(data);
      setStatus("connected");
    } catch (err) {
      setStatus("unavailable");
      setErrorMessage(err instanceof Error ? err.message : "Service unreachable");
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
      {/* Product Identity */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 border border-emerald-800 text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Clean Foundation Ready
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          LevelUp
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-xl mx-auto">
          Skill-aligned, peer-based coding practice in a friendly, supportive environment.
        </p>
      </div>

      {/* Platform Vision */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur text-left space-y-4 w-full">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          About the Platform
        </h2>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          LevelUp is designed for developers who want to improve their problem-solving skills alongside peers of similar ability. Practice together, learn without judgment, and progress through structured milestones without the pressure of high-stakes competition.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-400">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-1">Peer Matchmaking</span>
            Match with learners at your skill level.
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-1">Friendly Collaboration</span>
            Practice collaboratively without intimidation.
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-1">Track Progress</span>
            Earn XP and hit milestones at your pace.
          </div>
        </div>
      </div>

      {/* Backend Health Status Indicator */}
      <div className="w-full p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            aria-label="system-status-indicator"
            className={`w-3.5 h-3.5 rounded-full transition-colors ${
              status === "checking"
                ? "bg-amber-400 animate-pulse"
                : status === "connected"
                ? "bg-emerald-400"
                : "bg-rose-500"
            }`}
          />
          <div className="text-left">
            <div className="text-xs text-slate-400">Backend API Status</div>
            <div className="text-sm font-medium text-slate-200 capitalize">
              {status === "checking" && "Checking connection..."}
              {status === "connected" && (
                <span>
                  Connected <span className="text-slate-400 font-normal">({healthData?.app} v{healthData?.version})</span>
                </span>
              )}
              {status === "unavailable" && "Unavailable"}
            </div>
            {errorMessage && (
              <div className="text-xs text-rose-400 mt-0.5">{errorMessage}</div>
            )}
          </div>
        </div>

        <button
          onClick={fetchHealth}
          disabled={status === "checking"}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
        >
          Check Again
        </button>
      </div>
    </div>
  );
};
