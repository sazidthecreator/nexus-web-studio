// Core Web Vitals tracking on published sites.
// Only reports needs-improvement / poor — avoids flooding with "good" rows.
// Writes via the public ingest server function.

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import { reportVital } from "./vitals.functions";

let started = false;

export function trackVitals(projectId: string) {
  if (typeof window === "undefined") return;
  if (started) return;
  started = true;

  const report = (metric: Metric) => {
    if (metric.rating === "good") return;
    reportVital({
      data: {
        projectId,
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        url: window.location.pathname,
      },
    }).catch(() => undefined);
  };

  onCLS(report);
  onFCP(report);
  onLCP(report);
  onINP(report);
  onTTFB(report);
}
