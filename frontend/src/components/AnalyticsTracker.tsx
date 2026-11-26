import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getLatestReadyTitleForPath,
  initGA,
  normalizeAnalyticsPath,
  subscribeToTitleUpdates,
  trackPageView,
} from "../lib/analytics";

export const DEFAULT_TITLE_FALLBACK_MS = 1500;

export interface AnalyticsTrackerProps {
  titleFallbackMs?: number;
}

export function AnalyticsTracker({
  titleFallbackMs = DEFAULT_TITLE_FALLBACK_MS,
}: AnalyticsTrackerProps = {}) {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}`;
    const expectedPath = normalizeAnalyticsPath(location.pathname);
    let settled = false;
    let readyTimer: number | undefined;
    let fallbackTimer: number | undefined;
    let unsubscribe = () => {};

    const flush = (fallbackTitle?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      if (readyTimer !== undefined) {
        window.clearTimeout(readyTimer);
      }
      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
      }
      unsubscribe();
      trackPageView(pagePath, document.title || fallbackTitle);
    };

    const readyTitle = getLatestReadyTitleForPath(expectedPath);
    if (readyTitle !== null) {
      readyTimer = window.setTimeout(() => flush(readyTitle), 0);
    } else {
      unsubscribe = subscribeToTitleUpdates((detail) => {
        if (detail.path === expectedPath) {
          flush(detail.title);
        }
      });
      fallbackTimer = window.setTimeout(() => flush(), titleFallbackMs);
    }

    return () => {
      settled = true;
      if (readyTimer !== undefined) {
        window.clearTimeout(readyTimer);
      }
      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
      }
      unsubscribe();
    };
  }, [location.pathname, location.search, titleFallbackMs]);

  return null;
}
