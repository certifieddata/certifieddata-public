/**
 * Scoped CSS for CertifiedData badge widgets.
 * All classes are prefixed with `cd-` to avoid collisions.
 */
export const BADGE_STYLES = `
.cd-badge-root{display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1}
.cd-badge-root *{box-sizing:border-box;margin:0;padding:0}
.cd-badge-compact{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:99px;border:1px solid;font-size:11px;font-weight:600;text-decoration:none;transition:opacity .15s}
.cd-badge-compact:hover{opacity:.8}
.cd-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.cd-badge-inline{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:8px;border:1px solid;font-size:12px;text-decoration:none;transition:opacity .15s}
.cd-badge-inline:hover{opacity:.85}
.cd-inline-icon{font-size:13px;flex-shrink:0}
.cd-inline-body{display:flex;flex-direction:column;gap:1px}
.cd-inline-title{font-weight:600;font-size:11px}
.cd-inline-sub{font-size:10px;opacity:.7}
.cd-badge-full{display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-radius:10px;border:1px solid;font-size:12px;max-width:340px;text-decoration:none}
.cd-full-header{display:flex;align-items:center;gap:8px}
.cd-full-title{font-weight:700;font-size:13px}
.cd-full-status{font-size:10px;font-weight:600;opacity:.75;margin-left:auto}
.cd-full-row{display:flex;justify-content:space-between;font-size:10px;gap:8px}
.cd-full-label{opacity:.55;flex-shrink:0}
.cd-full-val{font-weight:500;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
.cd-full-footer{display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(128,128,128,.2);padding-top:8px;margin-top:4px}
.cd-full-link{font-size:10px;text-decoration:underline;opacity:.6;transition:opacity .15s}
.cd-full-link:hover{opacity:1}
.cd-full-issuer{font-size:9px;opacity:.4;font-weight:500;letter-spacing:.02em;text-transform:uppercase}
.cd-dark{color:#e4e4e7}
.cd-light{color:#1a1a2e}
`.trim();

export const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  active:      { bg: "rgba(34,197,94,0.12)",  border: "#22c55e", text: "#22c55e", dot: "#22c55e" },
  deprecated:  { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", text: "#f59e0b", dot: "#f59e0b" },
  revoked:     { bg: "rgba(239,68,68,0.12)",  border: "#ef4444", text: "#ef4444", dot: "#ef4444" },
  invalid:     { bg: "rgba(159,159,159,0.1)", border: "#9f9f9f", text: "#9f9f9f", dot: "#9f9f9f" },
  unavailable: { bg: "rgba(159,159,159,0.1)", border: "#9f9f9f", text: "#9f9f9f", dot: "#9f9f9f" },
};

export const STATUS_LABEL: Record<string, string> = {
  active:      "Verified",
  deprecated:  "Legacy Schema",
  revoked:     "Revoked",
  invalid:     "Invalid",
  unavailable: "Unavailable",
};
