import React from "react";
import { Link } from "react-router-dom";
import SEO, { SITE_URL } from "../components/SEO";

const BLOG_BREADCRUMB = {
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
      name: "Blog",
      item: `${SITE_URL}/blog`,
    },
  ],
};

export const BlogPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Blog - Beginner Programming Guides & Practice Tips"
        description="Read practical beginner programming guides on LevelUp. Learn Python basics, starter coding questions, and step-by-step problem-solving habits."
        path="/blog"
        structuredData={BLOG_BREADCRUMB}
      />

      <div className="max-w-3xl mx-auto w-full space-y-8 min-h-[75vh]">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            LevelUp Programming Blog
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            Clear, step-by-step guides to help Indian college students and first-time coders build
            real confidence with programming logic and practice questions.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">Featured Beginner Guide</h2>

          <article className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-700/70 transition space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-medium">
                Beginner Guide
              </span>
              <span>Published November 26, 2026</span>
              <span>·</span>
              <span>6 min read</span>
            </div>

            <h3 className="text-xl font-bold text-white">
              <Link
                to="/blog/how-to-start-learning-programming-as-a-beginner"
                className="hover:text-emerald-400 transition"
              >
                How to Start Learning Programming as a Beginner: Basics, Python Practice &amp; Next
                Steps
              </Link>
            </h3>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Not sure which language to pick first or how to move from watching tutorials to
              writing code yourself? This practical guide walks through beginning programming
              languages, the 4 core building blocks of logic, a trace-by-hand Python example, and
              beginner practice questions you can attempt on LevelUp.
            </p>

            <div className="pt-1 flex flex-wrap gap-3">
              <Link
                to="/blog/how-to-start-learning-programming-as-a-beginner"
                className="px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
              >
                Read Full Guide →
              </Link>
              <Link
                to="/challenges"
                className="px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
              >
                Explore Practice Challenges
              </Link>
            </div>
          </article>
        </section>

        <section className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Want to know more about LevelUp?</h2>
            <p className="text-sm text-slate-400">
              Read how our challenge platform supports calm, beginner-focused learning.
            </p>
          </div>
          <Link
            to="/about"
            className="px-4 py-2.5 min-h-[44px] inline-flex items-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
          >
            About LevelUp
          </Link>
        </section>
      </div>
    </>
  );
};
