import React, { Suspense, lazy, useEffect, useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { AnalyticsTracker } from "../src/components/AnalyticsTracker";
import SEO from "../src/components/SEO";
import {
  DEFAULT_GA_MEASUREMENT_ID,
  initGA,
  resetAnalyticsForTests,
  trackAuthSuccess,
  trackChallengeFilter,
  trackChallengeSearch,
  trackChallengeSubmit,
  trackChallengeView,
  trackPageView,
} from "../src/lib/analytics";

function RouteDriver({ onReady }: { onReady: (go: (to: string) => void) => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    onReady((to: string) => navigate(to));
  }, [navigate, onReady]);
  return null;
}

describe("GA4 Analytics Integration", () => {
  beforeEach(() => {
    resetAnalyticsForTests();
    document.head.innerHTML = "";
    document.title = "";
    delete (window as { gtag?: unknown }).gtag;
    window.dataLayer = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes GA4 script once with send_page_view disabled to avoid duplicate page views", () => {
    const first = initGA();
    const second = initGA();

    expect(first).toBe(true);
    expect(second).toBe(true);

    const scripts = document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).toHaveAttribute(
      "src",
      `https://www.googletagmanager.com/gtag/js?id=${DEFAULT_GA_MEASUREMENT_ID}`
    );

    const calls = window.dataLayer.map((entry) => Array.from(entry as ArrayLike<unknown>));
    const configCalls = calls.filter((c) => c[0] === "config");
    expect(configCalls).toHaveLength(1);
    expect(configCalls[0]).toEqual([
      "config",
      DEFAULT_GA_MEASUREMENT_ID,
      { send_page_view: false },
    ]);
  });

  it("reuses the static GTM-KTGZV5ZW head tag without injecting a second Google tag or duplicate js init", () => {
    const gtmScript = document.createElement("script");
    gtmScript.async = true;
    gtmScript.src = "https://www.googletagmanager.com/gtm.js?id=GTM-KTGZV5ZW";
    document.head.appendChild(gtmScript);

    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());

    expect(initGA()).toBe(true);

    const allGoogleScripts = document.querySelectorAll('script[src*="googletagmanager.com/"]');
    expect(allGoogleScripts).toHaveLength(1);
    expect(allGoogleScripts[0]).toHaveAttribute(
      "src",
      "https://www.googletagmanager.com/gtm.js?id=GTM-KTGZV5ZW"
    );

    const calls = window.dataLayer.map((entry) => Array.from(entry as ArrayLike<unknown>));
    expect(calls.filter((c) => c[0] === "js")).toHaveLength(1);
    expect(calls.filter((c) => c[0] === "config")).toEqual([
      ["config", DEFAULT_GA_MEASUREMENT_ID, { send_page_view: false }],
    ]);
  });

  it("tracks SPA route changes via AnalyticsTracker without duplicating the same route", async () => {
    initGA();
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    let goTo: (to: string) => void = () => {};
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AnalyticsTracker titleFallbackMs={20} />
        <RouteDriver onReady={(fn) => { goTo = fn; }} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({ page_path: "/" })
      );
    });

    const initialPageViews = gtagSpy.mock.calls.filter((c) => c[1] === "page_view");
    expect(initialPageViews).toHaveLength(1);

    act(() => {
      goTo("/challenges");
    });

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({ page_path: "/challenges" })
      );
    });

    // Re-tracking the same path is deduplicated
    trackPageView("/challenges", "Challenges | LevelUp");
    const challengePageViews = gtagSpy.mock.calls.filter(
      (c) => c[1] === "page_view" && c[2]?.page_path === "/challenges"
    );
    expect(challengePageViews).toHaveLength(1);
  });

  it("waits for React Helmet updates across sync, lazy, and async SPA routes before sending page_view", async () => {
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    const LazyAboutPage = lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) => {
          setTimeout(() => {
            resolve({
              default: function AboutMock() {
                return (
                  <>
                    <SEO title="About Us" description="About LevelUp" path="/about" />
                    <h1>About</h1>
                  </>
                );
              },
            });
          }, 40);
        })
    );

    function AsyncChallengeMock() {
      const [loadedTitle, setLoadedTitle] = useState<string | null>(null);
      useEffect(() => {
        const timer = setTimeout(() => {
          setLoadedTitle("Two Sum - arrays Coding Challenge");
        }, 40);
        return () => clearTimeout(timer);
      }, []);

      if (!loadedTitle) {
        return <div>Loading challenge…</div>;
      }

      return (
        <>
          <SEO
            title={loadedTitle}
            description="Solve Two Sum"
            path="/challenges/1"
          />
          <h1>Two Sum</h1>
        </>
      );
    }

    let goTo: (to: string) => void = () => {};
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/"]}>
          <AnalyticsTracker />
          <RouteDriver onReady={(fn) => { goTo = fn; }} />
          <Suspense fallback={<div>Loading route…</div>}>
            <Routes>
              <Route
                path="/"
                element={<SEO title="Home" description="Home page" path="/" />}
              />
              <Route
                path="/challenges"
                element={
                  <SEO
                    title="Coding Challenges for Beginners"
                    description="Challenges list"
                    path="/challenges"
                  />
                }
              />
              <Route path="/challenges/1" element={<AsyncChallengeMock />} />
              <Route path="/about" element={<LazyAboutPage />} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/",
          page_title: "Home | LevelUp",
        })
      );
    });

    // Synchronous route transition: / -> /challenges
    act(() => {
      goTo("/challenges");
    });

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/challenges",
          page_title: "Coding Challenges for Beginners | LevelUp",
        })
      );
    });

    // Same-pathname query string navigation keeps updated route title
    act(() => {
      goTo("/challenges?difficulty=Easy");
    });

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/challenges?difficulty=Easy",
          page_title: "Coding Challenges for Beginners | LevelUp",
        })
      );
    });

    // Async data-fetching route: /challenges?difficulty=Easy -> /challenges/1
    act(() => {
      goTo("/challenges/1");
    });

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/challenges/1",
          page_title: "Two Sum - arrays Coding Challenge | LevelUp",
        })
      );
    });

    // Lazy-loaded route: /challenges/1 -> /about
    act(() => {
      goTo("/about");
    });

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/about",
          page_title: "About Us | LevelUp",
        })
      );
    });

    const pageViewCalls = gtagSpy.mock.calls.filter((c) => c[1] === "page_view");
    expect(pageViewCalls).toHaveLength(5);
    expect(pageViewCalls.map((c) => [c[2].page_path, c[2].page_title])).toEqual([
      ["/", "Home | LevelUp"],
      ["/challenges", "Coding Challenges for Beginners | LevelUp"],
      ["/challenges?difficulty=Easy", "Coding Challenges for Beginners | LevelUp"],
      ["/challenges/1", "Two Sum - arrays Coding Challenge | LevelUp"],
      ["/about", "About Us | LevelUp"],
    ]);
  });

  it("preserves single page_view with updated title under React StrictMode and cancels abandoned routes", async () => {
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    const SlowLazyRoute = lazy(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) => {
          setTimeout(() => {
            resolve({
              default: () => (
                <SEO title="Slow Page" description="Slow route" path="/slow" />
              ),
            });
          }, 80);
        })
    );

    let goTo: (to: string) => void = () => {};
    render(
      <React.StrictMode>
        <HelmetProvider>
          <MemoryRouter initialEntries={["/"]}>
            <AnalyticsTracker />
            <RouteDriver onReady={(fn) => { goTo = fn; }} />
            <Suspense fallback={<div>Loading…</div>}>
              <Routes>
                <Route
                  path="/"
                  element={<SEO title="Home" description="Home page" path="/" />}
                />
                <Route path="/slow" element={<SlowLazyRoute />} />
                <Route
                  path="/blog"
                  element={
                    <SEO
                      title="Blog - Beginner Programming Guides"
                      description="Blog page"
                      path="/blog"
                    />
                  }
                />
              </Routes>
            </Suspense>
          </MemoryRouter>
        </HelmetProvider>
      </React.StrictMode>
    );

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/",
          page_title: "Home | LevelUp",
        })
      );
    });

    // Navigate to /slow, then immediately abandon it for /blog before /slow resolves
    act(() => {
      goTo("/slow");
    });
    act(() => {
      goTo("/blog");
    });

    await waitFor(() => {
      expect(gtagSpy).toHaveBeenCalledWith(
        "event",
        "page_view",
        expect.objectContaining({
          page_path: "/blog",
          page_title: "Blog - Beginner Programming Guides | LevelUp",
        })
      );
    });

    // Give the slow route promise time to settle so we confirm it does not fire late
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });

    const pageViewCalls = gtagSpy.mock.calls.filter((c) => c[1] === "page_view");
    expect(pageViewCalls).toHaveLength(2);
    expect(pageViewCalls.map((c) => c[2].page_path)).toEqual(["/", "/blog"]);
  });

  it("emits non-PII custom events for challenges and auth flows", () => {
    initGA();
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    trackChallengeView({
      id: 1,
      slug: "two-sum",
      title: "Two Sum",
      difficulty: "Easy",
      topic: "arrays",
    });
    trackChallengeSearch("  binary  ");
    trackChallengeSearch("   "); // ignored empty search
    trackChallengeFilter("Medium");
    trackChallengeSubmit({
      challengeId: 1,
      slug: "two-sum",
      language: "python",
      status: "ACCEPTED",
    });
    trackAuthSuccess("login");
    trackAuthSuccess("sign_up");

    expect(gtagSpy).toHaveBeenCalledWith("event", "view_challenge", {
      challenge_id: 1,
      challenge_slug: "two-sum",
      challenge_title: "Two Sum",
      difficulty: "Easy",
      topic: "arrays",
    });
    expect(gtagSpy).toHaveBeenCalledWith("event", "search", {
      search_used: true,
    });
    expect(gtagSpy).toHaveBeenCalledWith("event", "filter_challenges", {
      difficulty: "Medium",
    });
    expect(gtagSpy).toHaveBeenCalledWith("event", "submit_challenge_solution", {
      challenge_id: 1,
      challenge_slug: "two-sum",
      language: "python",
      submission_status: "ACCEPTED",
      is_simulated: true,
    });
    expect(gtagSpy).toHaveBeenCalledWith("event", "login", { method: "password" });
    expect(gtagSpy).toHaveBeenCalledWith("event", "sign_up", { method: "password" });

    // Confirm no blank search call and no PII keys in any emitted event payload
    expect(gtagSpy).toHaveBeenCalledTimes(6);
    for (const call of gtagSpy.mock.calls) {
      const payload = call[2] as Record<string, unknown>;
      expect(payload).not.toHaveProperty("search_term");
      expect(payload).not.toHaveProperty("source_code");
      expect(payload).not.toHaveProperty("email");
      expect(payload).not.toHaveProperty("username");
      expect(payload).not.toHaveProperty("password");
    }
  });
});
