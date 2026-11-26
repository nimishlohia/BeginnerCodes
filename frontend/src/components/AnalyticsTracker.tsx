import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initGA, trackPageView } from "../lib/analytics";

export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}`;
    const timer = window.setTimeout(() => {
      trackPageView(pagePath, document.title);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  return null;
}
