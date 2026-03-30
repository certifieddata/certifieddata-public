/**
 * Fire-and-forget badge analytics tracking.
 * Calls POST /api/badge/:id/track — never throws.
 */
export async function trackEvent(opts: {
  apiBase: string;
  certId: string;
  eventType: "impression" | "click" | "expand" | "verify";
  sourceUrl?: string;
  installType?: string;
}): Promise<void> {
  const { apiBase, certId, eventType, sourceUrl = "", installType = "module" } = opts;
  const url = `${apiBase}/api/badge/${encodeURIComponent(certId)}/track`;
  const body = JSON.stringify({ event_type: eventType, source_url: sourceUrl, install_type: installType });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    }
  } catch {
    // tracking is best-effort
  }
}
