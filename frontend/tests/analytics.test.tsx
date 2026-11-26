import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { AnalyticsTracker } from "../src/components/AnalyticsTracker";
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
  onReady((to: string) => navigate(to));
  return null;
}

describe("GA4 Analytics Integration", () => {
  beforeEach(() => {
    resetAnalyticsForTests();
    document.head.innerHTML = "";
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

  it("tracks SPA route changes via AnalyticsTracker without duplicating the same route", async () => {
    initGA();
    const gtagSpy = vi.fn();
    window.gtag = gtagSpy;

    let goTo: (to: string) => void = () => {};
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AnalyticsTracker />
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
