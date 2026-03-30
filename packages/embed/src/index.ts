/**
 * @certifieddata/embed
 *
 * TypeScript module for rendering CertifiedData verification badges.
 *
 * Quick start (browser / framework):
 *
 *   import { renderBadge } from "@certifieddata/embed";
 *
 *   const container = document.getElementById("cert-badge")!;
 *   await renderBadge(container, {
 *     certId: "YOUR_CERT_ID",
 *     variant: "inline",
 *     theme: "dark",
 *   });
 *
 * For script-tag install, use the hosted embed.js instead:
 *   <script src="https://certifieddata.io/embed.js" data-cert-id="YOUR_CERT_ID"></script>
 */

import type { BadgeData, BadgeConfig } from "@certifieddata/badge-types";
import { BADGE_STYLES } from "./styles.js";
import { createBadgeElement } from "./render.js";
import { trackEvent } from "./track.js";

export type { BadgeData, BadgeConfig, BadgeStatus, BadgeVariant, BadgeTheme } from "./types.js";
export { BADGE_STYLES } from "./styles.js";
export { createBadgeElement } from "./render.js";
export { trackEvent } from "./track.js";

const DEFAULT_API_BASE = "https://certifieddata.io";
const STYLES_ATTR = "data-cd-styles-injected";

function ensureStyles(doc: Document = document): void {
  if (doc.querySelector(`[${STYLES_ATTR}]`)) return;
  const style = doc.createElement("style");
  style.setAttribute(STYLES_ATTR, "1");
  style.textContent = BADGE_STYLES;
  doc.head.appendChild(style);
}

function resolveConfig(config: BadgeConfig): Required<BadgeConfig> {
  return {
    certId: config.certId,
    variant: config.variant ?? "inline",
    theme: config.theme === "auto"
      ? (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : (config.theme ?? "dark"),
    showHash: config.showHash ?? false,
    linkTarget: config.linkTarget ?? "_blank",
    showMachineLinks: config.showMachineLinks ?? false,
    apiBase: config.apiBase ?? DEFAULT_API_BASE,
  };
}

/**
 * Fetch badge data from the CertifiedData API.
 * Returns null on any fetch or parse error (graceful degradation).
 */
export async function fetchBadgeData(
  certId: string,
  apiBase: string = DEFAULT_API_BASE
): Promise<BadgeData | null> {
  try {
    const res = await fetch(`${apiBase}/api/badge/${encodeURIComponent(certId)}`);
    if (!res.ok) return null;
    return (await res.json()) as BadgeData;
  } catch {
    return null;
  }
}

/**
 * Render a CertifiedData verification badge into a container element.
 *
 * Fetches badge data, renders the widget, fires an impression event,
 * and optionally injects machine-readable JSON-LD.
 */
export async function renderBadge(
  container: HTMLElement,
  config: BadgeConfig
): Promise<void> {
  const cfg = resolveConfig(config);
  ensureStyles(container.ownerDocument ?? document);

  const data = await fetchBadgeData(cfg.certId, cfg.apiBase);
  const widget = createBadgeElement(data, cfg);

  container.innerHTML = "";
  container.appendChild(widget);

  // Click tracking
  widget.addEventListener("click", () => {
    void trackEvent({
      apiBase: cfg.apiBase,
      certId: cfg.certId,
      eventType: "click",
      sourceUrl: typeof window !== "undefined" ? window.location.href : "",
      installType: "module",
    });
  });

  // Impression
  void trackEvent({
    apiBase: cfg.apiBase,
    certId: cfg.certId,
    eventType: "impression",
    sourceUrl: typeof window !== "undefined" ? window.location.href : "",
    installType: "module",
  });

  // Optional machine-readable metadata
  if (cfg.showMachineLinks && data) {
    const doc = container.ownerDocument ?? document;
    const ld = doc.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: data.artifact_name ?? `CertifiedData Certificate ${cfg.certId}`,
      identifier: cfg.certId,
      creator: { "@type": "Organization", name: "CertifiedData.io", url: "https://certifieddata.io" },
      dateCreated: data.issued_at,
      url: data.certificate_url,
      encodingFormat: data.artifact_type,
    });
    container.appendChild(ld);
  }
}
