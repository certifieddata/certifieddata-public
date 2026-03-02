/**
 * CertifiedData.io certificate manifest envelope.
 *
 * Returned by:  GET /api/cert/:id/manifest
 *               Accept: application/certifieddata.manifest+json
 *
 * The `payload` field is exactly what was signed. The signing input is:
 *   canonicalize(payload)  →  UTF-8 bytes  →  Ed25519 sign
 *
 * Canonicalization rule: strip undefined values, then JSON with keys sorted
 * alphabetically at every level (equivalent to json-stable-stringify).
 */
export interface CertifiedDataManifestEnvelope {
  schema_version: "certifieddata.manifest.v1" | "sdaas.manifest.v1"; // legacy alias accepted
  payload: CertifiedDataCertPayload;
  signature: CertifiedDataSignature;
}

export interface CertifiedDataSignature {
  alg: "Ed25519" | "HMAC-SHA256";
  key_id: string | null;
  value: string | null; // base64-encoded signature bytes
}

/**
 * The cert.v1 payload structure (subset of fields relevant to integrators).
 * The full payload may contain additional fields — they are included in signing.
 */
export interface CertifiedDataCertPayload {
  schema_version: string;       // e.g. "cert.v1"
  certificate_id: string;
  certificate_type: "GENESIS" | "REPLICA";
  issued_at: string;            // ISO 8601
  issuer: {
    name: string;               // "CertifiedData.io"
    environment: string;        // "production" | "development"
    signing_key_id: string;
    signature_alg: string;
  };
  subject: {
    org_id?: string;
    user_id?: string;
    project?: string;
    dataset_name?: string;
  };
  hashes: {
    certificate_payload_sha256: string; // hex SHA-256 of canonical payload bytes
    datasets?: Record<string, {
      sha256: string;
      size_bytes?: number;
      row_count?: number;
    }>;
  };
  provenance?: {
    audit_vault_retention_years?: number;
    audit_vault_entry_ids?: string[];
  };
  // genesis / replica sections may be present depending on certificate_type
  genesis?: Record<string, unknown>;
  replica?: Record<string, unknown>;
  acceptance?: Record<string, unknown>;
  [key: string]: unknown;
}

export type VerifyResult =
  | { verified: true;  alg: string; key_id: string | null }
  | { verified: false; alg?: string; key_id?: string | null; reason: string };
