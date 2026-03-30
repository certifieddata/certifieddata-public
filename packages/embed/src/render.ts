/**
 * DOM rendering helpers for CertifiedData badge variants.
 * Works in browser environments with a live DOM.
 */
import type { BadgeData, BadgeConfig } from "@certifieddata/badge-types";
import { STATUS_COLORS, STATUS_LABEL } from "./styles.js";

function resolvedStatus(data: BadgeData | null): string {
  if (!data) return "unavailable";
  if (data.status === "active" && data.is_deprecated) return "deprecated";
  return data.status;
}

function fallbackData(apiBase: string): BadgeData {
  return {
    certificate_id: "",
    artifact_name: null,
    artifact_type: "synthetic_dataset",
    certificate_url: apiBase + "/verify",
    issued_at: new Date().toISOString(),
    issuer: "CertifiedData.io",
    schema_version: "cert.v1",
    status: "unavailable",
    is_verified: false,
    is_deprecated: false,
    hash_algorithm: "SHA-256",
    signature_algorithm: "Ed25519",
    hash_short: "",
    hash_full: "",
    signed_payload_url: "",
    verification_url: apiBase + "/verify",
    signing_keys_url: apiBase + "/.well-known/signing-keys.json",
  };
}

export function createBadgeElement(
  data: BadgeData | null,
  config: Required<BadgeConfig>
): HTMLElement {
  const d = data ?? fallbackData(config.apiBase);
  const variant = config.variant;
  if (variant === "compact") return renderCompact(d, config);
  if (variant === "full") return renderFull(d, config);
  return renderInline(d, config);
}

function renderCompact(data: BadgeData, cfg: Required<BadgeConfig>): HTMLElement {
  const status = resolvedStatus(data);
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.unavailable;
  const label = STATUS_LABEL[status] ?? status;
  const themeClass = cfg.theme === "light" ? "cd-light" : "cd-dark";

  const el = document.createElement("a") as HTMLAnchorElement;
  el.className = `cd-badge-compact ${themeClass}`;
  el.href = data.verification_url;
  el.target = cfg.linkTarget;
  el.rel = "noopener noreferrer";
  el.style.cssText = `background:${c.bg};border-color:${c.border};color:${c.text}`;
  el.setAttribute("aria-label", `CertifiedData.io — ${label}`);

  const dot = document.createElement("span");
  dot.className = "cd-dot";
  dot.style.background = c.dot;
  el.appendChild(dot);
  el.appendChild(document.createTextNode(`CertifiedData · ${label}`));
  return el;
}

function renderInline(data: BadgeData, cfg: Required<BadgeConfig>): HTMLElement {
  const status = resolvedStatus(data);
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.unavailable;
  const label = STATUS_LABEL[status] ?? status;
  const themeClass = cfg.theme === "light" ? "cd-light" : "cd-dark";

  const el = document.createElement("a") as HTMLAnchorElement;
  el.className = `cd-badge-inline ${themeClass}`;
  el.href = data.verification_url;
  el.target = cfg.linkTarget;
  el.rel = "noopener noreferrer";
  el.style.cssText = `background:${c.bg};border-color:${c.border}`;
  el.setAttribute("aria-label", `CertifiedData.io — ${label}`);

  const icon = document.createElement("span");
  icon.className = "cd-inline-icon";
  icon.style.color = c.text;
  icon.textContent = status === "active" || status === "deprecated" ? "✓" : "⚠";
  el.appendChild(icon);

  const body = document.createElement("span");
  body.className = "cd-inline-body";
  const t = document.createElement("span");
  t.className = "cd-inline-title";
  t.style.color = c.text;
  t.textContent = "CertifiedData.io";
  const s = document.createElement("span");
  s.className = "cd-inline-sub";
  s.textContent = data.artifact_name
    ? `${label} · ${data.artifact_name.slice(0, 28)}`
    : label;
  body.appendChild(t);
  body.appendChild(s);
  el.appendChild(body);
  return el;
}

function renderFull(data: BadgeData, cfg: Required<BadgeConfig>): HTMLElement {
  const status = resolvedStatus(data);
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.unavailable;
  const label = STATUS_LABEL[status] ?? status;
  const themeClass = cfg.theme === "light" ? "cd-light" : "cd-dark";
  const bgBase = cfg.theme === "light" ? "#fff" : "#18181b";

  const el = document.createElement("a") as HTMLAnchorElement;
  el.className = `cd-badge-full ${themeClass}`;
  el.href = data.verification_url;
  el.target = cfg.linkTarget;
  el.rel = "noopener noreferrer";
  el.style.cssText = `background:${bgBase};border-color:${c.border}`;

  // Header
  const hdr = document.createElement("div");
  hdr.className = "cd-full-header";
  const dot = document.createElement("span");
  dot.className = "cd-dot";
  dot.style.cssText = `background:${c.dot};width:8px;height:8px`;
  const title = document.createElement("span");
  title.className = "cd-full-title";
  title.textContent = data.artifact_name?.slice(0, 36) ?? "Certified Dataset";
  const st = document.createElement("span");
  st.className = "cd-full-status";
  st.style.color = c.text;
  st.textContent = label;
  hdr.append(dot, title, st);
  el.appendChild(hdr);

  // Rows
  const rows: [string, string][] = [
    ["Issuer", data.issuer],
    ["Type", data.artifact_type],
  ];
  if (data.issued_at) rows.push(["Issued", data.issued_at.slice(0, 10)]);
  if (cfg.showHash && data.hash_short) rows.push(["SHA-256", data.hash_short]);
  rows.push(["Algorithm", data.signature_algorithm]);

  for (const [lbl, val] of rows) {
    const row = document.createElement("div");
    row.className = "cd-full-row";
    const l = document.createElement("span");
    l.className = "cd-full-label";
    l.textContent = lbl;
    const v = document.createElement("span");
    v.className = "cd-full-val";
    v.textContent = val;
    row.append(l, v);
    el.appendChild(row);
  }

  // Footer
  const ftr = document.createElement("div");
  ftr.className = "cd-full-footer";
  const link = document.createElement("span");
  link.className = "cd-full-link";
  link.style.color = c.text;
  link.textContent = "View certificate →";
  const issuer = document.createElement("span");
  issuer.className = "cd-full-issuer";
  issuer.textContent = "certifieddata.io";
  ftr.append(link, issuer);
  el.appendChild(ftr);

  return el;
}
