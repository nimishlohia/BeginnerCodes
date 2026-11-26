import React from "react";
import { Link } from "react-router-dom";
import SEO, { SITE_NAME, SITE_URL } from "../components/SEO";

const ABOUT_BREADCRUMB = {
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
      name: "About Us",
      item: `${SITE_URL}/about`,
    },
  ],
};

export const AboutPage: React.FC = () => {
  return (
    <>
      <SEO
        title="About Us - Friendly Coding Practice Platform"
        description="Discover LevelUp, a beginner-friendly platform for programming practice, coding challenges, and building problem-solving skills step by step."
        path="/about"
        structuredData={ABOUT_BREADCRUMB}
      />

      <div className="max-w-3xl mx-auto w-full space-y-8 min-h-[75vh]">
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            About LevelUp
          </h1>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            LevelUp is built for learners in India and around the world who want a calm,
            supportive space for{" "}
            <strong className="font-semibold text-slate-100">
              programming practice for beginners
            </strong>{" "}
            without the pressure of high-stakes leaderboards.
          </p>
        </header>

        <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-xl font-bold text-white">Why LevelUp Exists</h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Many college students and first-time coders feel overwhelmed when they open competitive
            programming sites filled with advanced math puzzles and timed rankings. LevelUp focuses
            on clarity first: readable problem statements, clear input and output formats, and the{" "}
            <strong className="font-semibold text-slate-100">
              basics of programming for beginners
            </strong>
            .
          </p>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Whether you are writing your first loops in college labs or revisiting core logic after
            class, you can study real{" "}
            <strong className="font-semibold text-slate-100">
              programming code for beginners
            </strong>
            , work through sample test cases on paper, and build confidence one problem at a time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">What You Can Do on LevelUp Today</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <article className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">
                Browse Public Challenges
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Explore starter problems filtered by difficulty and topic on the{" "}
                <Link to="/challenges" className="text-emerald-400 hover:underline">
                  Challenges catalogue
                </Link>{" "}
                without needing an account first.
              </p>
            </article>

            <article className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">
                Draft in 8 Languages
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Save and review your solutions in Python, Java, JavaScript, TypeScript, C++, C, Go,
                or Rust. (Evaluation feedback is currently simulated and clearly labeled.)
              </p>
            </article>

            <article className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">
                Keep Your Practice Log
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Create a free account to record your preferred language, track self-reported skills,
                and review your personal submission history.
              </p>
            </article>
          </div>
        </section>

        <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-xl font-bold text-white">Learn With Official Documentation</h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Good practice pairs problem-solving with reliable reference material. Alongside our{" "}
            <Link
              to="/blog/how-to-start-learning-programming-as-a-beginner"
              className="text-emerald-400 hover:underline font-medium"
            >
              beginner programming guide
            </Link>
            , we recommend keeping official language documentation open while you practice:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-300">
            <li>
              <a
                href="https://docs.python.org/3/tutorial/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Official Python 3 Tutorial
              </a>{" "}
              — clear syntax and core library examples.
            </li>
            <li>
              <a
                href="https://docs.oracle.com/javase/tutorial/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                Oracle Java Tutorials
              </a>{" "}
              — structured object-oriented fundamentals.
            </li>
            <li>
              <a
                href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                MDN Web Docs JavaScript Guide
              </a>{" "}
              — practical web scripting reference.
            </li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Ready to Practice Your First Problem?</h2>
            <p className="text-sm text-slate-300">
              Start with our beginner guide or jump straight into the challenge list on {SITE_NAME}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/challenges"
              className="px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
            >
              Browse Challenges
            </Link>
            <Link
              to="/blog"
              className="px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
            >
              Read the Blog
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};
