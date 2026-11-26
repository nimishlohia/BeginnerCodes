export const DEFAULT_GA_MEASUREMENT_ID = "G-V187F2K2C2";

type TitleUpdateDetail = {
  path: string;
  title: string;
};

type TitleUpdateListener = (detail: TitleUpdateDetail) => void;

const titleListeners = new Set<TitleUpdateListener>();
let latestReadyTitle: TitleUpdateDetail | null = null;
let initializedId: string | null = null;
let lastTrackedPage: string | null = null;

export function normalizeAnalyticsPath(path: string): string {
  const trimmed = path.trim() || "/";
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

export function notifyTitleUpdated(path: string, title: string): void {
  const detail: TitleUpdateDetail = {
    path: normalizeAnalyticsPath(path),
    title,
  };
  latestReadyTitle = detail;
  for (const listener of titleListeners) {
    listener(detail);
  }
}

export function getLatestReadyTitleForPath(path: string): string | null {
  if (!latestReadyTitle) {
    return null;
  }
  return latestReadyTitle.path === normalizeAnalyticsPath(path)
    ? latestReadyTitle.title
    : null;
}

export function subscribeToTitleUpdates(
  listener: TitleUpdateListener
): () => void {
  titleListeners.add(listener);
  return () => {
    titleListeners.delete(listener);
  };
}

export function getGaMeasurementId(): string {
  const configured = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (configured !== undefined) {
    return configured.trim();
  }
  return DEFAULT_GA_MEASUREMENT_ID;
}

export function initGA(explicitId?: string): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const measurementId = (explicitId ?? getGaMeasurementId()).trim();
  if (!measurementId) {
    return false;
  }

  if (initializedId === measurementId) {
    return true;
  }

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // gtag.js requires the Arguments object in dataLayer rather than a plain Array
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }

  const existingScript = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js"]`
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      measurementId
    )}`;
    script.dataset.gaMeasurementId = measurementId;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
  });

  initializedId = measurementId;
  return true;
}

export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  if (!initializedId) {
    return;
  }

  const normalizedPath = pagePath || "/";
  if (lastTrackedPage === normalizedPath) {
    return;
  }
  lastTrackedPage = normalizedPath;

  window.gtag("event", "page_view", {
    page_path: normalizedPath,
    page_title: pageTitle ?? document.title,
    page_location: `${window.location.origin}${normalizedPath}`,
  });
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  if (!initializedId) {
    return;
  }
  window.gtag("event", eventName, params);
}

export function trackChallengeView(challenge: {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  topic: string;
}): void {
  trackEvent("view_challenge", {
    challenge_id: challenge.id,
    challenge_slug: challenge.slug,
    challenge_title: challenge.title,
    difficulty: challenge.difficulty,
    topic: challenge.topic,
  });
}

export function trackChallengeSearch(searchTerm: string): void {
  if (!searchTerm.trim()) {
    return;
  }
  trackEvent("search", {
    search_used: true,
  });
}

export function trackChallengeFilter(difficulty: string): void {
  trackEvent("filter_challenges", {
    difficulty: difficulty || "all",
  });
}

export function trackChallengeSubmit(params: {
  challengeId: number;
  slug: string;
  language: string;
  status: string;
}): void {
  trackEvent("submit_challenge_solution", {
    challenge_id: params.challengeId,
    challenge_slug: params.slug,
    language: params.language,
    submission_status: params.status,
    is_simulated: true,
  });
}

export function trackAuthSuccess(action: "login" | "sign_up"): void {
  trackEvent(action, {
    method: "password",
  });
}

export function resetAnalyticsForTests(): void {
  initializedId = null;
  lastTrackedPage = null;
  latestReadyTitle = null;
  titleListeners.clear();
}
