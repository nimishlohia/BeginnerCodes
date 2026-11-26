import SEO, { SITE_NAME, SITE_URL } from "../components/SEO";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { checkBackendHealth, HealthResponse } from "../lib/api";

type BackendStatus = "checking" | "connected" | "unavailable";

const HOME_STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Skill-aligned, peer-based coding practice in a friendly, supportive environment.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Improve your programming and problem-solving skills with LevelUp. Explore coding challenges, practice with peers and track your learning progress.",
  },
];

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
    <>
      <SEO
        title="Programming Practice for Beginners & Coding Challenges"
        description="Structured programming practice for beginners on LevelUp. Explore starter coding questions, Python beginner guides, and peer-aligned learning in India."
        path="/"
        structuredData={HOME_STRUCTURED_DATA}
      />

      <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
        {/* Product Identity */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 border border-emerald-800 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Beginner-Friendly Coding Platform
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            LevelUp
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-xl mx-auto">
            Skill-aligned, peer-based coding practice in a friendly, supportive environment.
          </p>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Built for Indian college students and first-time coders seeking calm{" "}
            <strong className="font-semibold text-slate-200">
              programming practice for beginners
            </strong>{" "}
            — without timed contests or intimidating rankings.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/challenges"
              className="px-5 py-2.5 min-h-[44px] inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
            >
              Browse Beginner Challenges
            </Link>
            <Link
              to="/blog/how-to-start-learning-programming-as-a-beginner"
              className="px-5 py-2.5 min-h-[44px] inline-flex items-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
            >
              Read the Beginner Guide
            </Link>
          </div>
        </div>

        {/* Platform Vision */}
        <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur text-left space-y-4 w-full">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            About the Platform
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            LevelUp is designed for developers who want to improve their problem-solving skills
            alongside peers of similar ability. Learn the{" "}
            <strong className="font-semibold text-slate-200">
              basics of programming for beginners
            </strong>
            , study input/output examples, and practice at your own pace without judgment.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-400">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
              <h3 className="font-semibold text-slate-200 text-xs">Step-by-Step Problems</h3>
              <p>Solve beginner-friendly problems with clear examples and constraints.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
              <h3 className="font-semibold text-slate-200 text-xs">Friendly Environment</h3>
              <p>Practice coding problems at your own pace without pressure or public leaderboards.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
              <h3 className="font-semibold text-slate-200 text-xs">8 Supported Languages</h3>
              <p>Draft solutions in Python, Java, JavaScript, TypeScript, C++, C, Go, or Rust.</p>
            </div>
          </div>
        </section>

        {/* Beginner Practice & Languages */}
        <section className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl text-left space-y-5 w-full">
          <h2 className="text-lg font-bold text-white">
            Programming Questions for Beginners &amp; Learning Paths
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Whether you are exploring{" "}
            <strong className="font-semibold text-slate-200">
              beginning programming languages
            </strong>{" "}
            for the first time or practicing for semester labs, start with clear exercises rather
            than jumping straight into complex theory.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">
                Start With Curated Starter Questions
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Begin with{" "}
                <Link to="/challenges/2" className="text-emerald-400 hover:underline">
                  Reverse a String
                </Link>
                ,{" "}
                <Link to="/challenges/1" className="text-emerald-400 hover:underline">
                  Two Sum
                </Link>
                , or{" "}
                <Link to="/challenges/4" className="text-emerald-400 hover:underline">
                  Binary Search
                </Link>{" "}
                in our{" "}
                <Link to="/challenges" className="text-emerald-400 hover:underline">
                  challenges catalogue
                </Link>
                .
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">
                Follow Our Beginner Guide
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                New to coding? Learn{" "}
                <Link
                  to="/blog/how-to-start-learning-programming-as-a-beginner"
                  className="text-emerald-400 hover:underline"
                >
                  how to start learning programming as a beginner
                </Link>{" "}
                with Python examples, or read{" "}
                <Link to="/about" className="text-emerald-400 hover:underline">
                  about LevelUp&apos;s mission
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Backend Health Status Indicator */}
        <div className="w-full p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              aria-label="system-status-indicator"
              className={`w-3.5 h-3.5 rounded-full transition-colors ${status === "checking"
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
            className="px-4 py-2.5 min-h-[44px] text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
          >
            Check Again
          </button>
        </div>
      </div>
    </>
  );
};
