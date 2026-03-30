/**
 * @certifieddata/badge-types
 *
 * Shared types for badge API responses and widget configuration.
 * Used by @certifieddata/embed and @certifieddata/sdk to stay in sync.
 */

/** Status as returned by GET /api/badge/:id */
export type BadgeStatus =
  | "active"       // ISSUED cert, current schema
  | "deprecated"   // ISSUED cert, older schema version
  | "revoked"      // REVOKED cert
  | "invalid"      // cert exists but is not in an issuable state
  | "unavailable"; // API fetch failed or cert not found

export type BadgeVariant = "compact" | "inline" | "full";

export type BadgeTheme = "light" | "dark" | "auto";

/**
 * Response shape from GET /api/badge/:id
 * Served with CORS and short-lived caching for active certs.
 */
export interface BadgeData {
  certificate_id: string;
  artifact_name: string | null;
  artifact_type: string;
  certificate_url: string;
  issued_at: string;
  issuer: string;
  schema_version: string;
  status: BadgeStatus;
  is_verified: boolean;
  is_deprecated: boolean;
  hash_algorithm: string;
  signature_algorithm: string;
  /** Short hash for display, e.g. "a7f3c9...91e2" */
  hash_short: string;
  /** Full raw hash without algorithm prefix */
  hash_full: string;
  signed_payload_url: string;
  verification_url: string;
  signing_keys_url: string;
}

/** Configuration options for the embed widget */
export interface BadgeConfig {
  certId: string;
  variant?: BadgeVariant;
  theme?: BadgeTheme;
  showHash?: boolean;
  linkTarget?: "_blank" | "_self";
  showMachineLinks?: boolean;
  /** Override API base URL (defaults to https://certifieddata.io) */
  apiBase?: string;
}
