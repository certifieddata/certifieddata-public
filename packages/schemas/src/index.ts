/**
 * @certifieddata/schemas
 *
 * Canonical public certificate schema definitions for CertifiedData.io.
 * Single source of truth for schema versions, field definitions, and validators.
 *
 * Quick start:
 *
 *   import {
 *     ACTIVE_SCHEMA_VERSION,
 *     isSupportedSchemaVersion,
 *     parseCertificatePayload,
 *   } from "@certifieddata/schemas";
 */

// ── Version constants ──────────────────────────────────────────────────────────

/** The current canonical schema version issued by CertifiedData.io */
export const ACTIVE_SCHEMA_VERSION = "cert.v2" as const;

/** All schema versions that have ever been issued */
export const ALL_SCHEMA_VERSIONS = ["cert.v1", "cert.v2"] as const;

/** Versions that are still supported but deprecated — will not be issued to new certs */
export const DEPRECATED_SCHEMA_VERSIONS = ["cert.v1"] as const;

export type SchemaVersion = (typeof ALL_SCHEMA_VERSIONS)[number];

/** Returns true if the given schema version is known and supported for verification */
export function isSupportedSchemaVersion(version: string): version is SchemaVersion {
  return (ALL_SCHEMA_VERSIONS as readonly string[]).includes(version);
}

/** Returns true if the schema version is deprecated (issued but no longer the active version) */
export function isDeprecatedSchemaVersion(version: string): boolean {
  return (DEPRECATED_SCHEMA_VERSIONS as readonly string[]).includes(version);
}

// ── Certificate payload types ──────────────────────────────────────────────────

/** Payload that was signed by CertifiedData.io */
export interface CertificatePayload {
  /** Certificate UUID */
  certification_id: string;
  /** ISO-8601 timestamp of issuance */
  timestamp: string;
  /** Issuing authority */
  issuer: string;
  /** SHA-256 hash of the certified dataset, with algorithm prefix */
  dataset_hash: string;
  /** Generation algorithm used (e.g. "CTGAN") */
  algorithm: string;
  /** Row count of the synthetic dataset */
  rows: number;
  /** Column count of the synthetic dataset */
  columns: number;
  /** Schema version of this certificate format */
  schema_version: SchemaVersion;
  /** Optional: dataset name / title */
  dataset_name?: string;
  /** Optional: artifact type (defaults to "synthetic_dataset") */
  artifact_type?: string;
  /** Optional: additional metadata */
  metadata?: Record<string, unknown>;
}

/** Full signed certificate envelope (matches SdaasManifestEnvelope from @certifieddata/verify) */
export interface SignedCertificateEnvelope {
  payload: CertificatePayload;
  signature: {
    alg: string;
    key_id: string;
    /** Base64-encoded Ed25519 signature over the canonical payload bytes */
    value: string | null;
  };
}

// ── Validation ─────────────────────────────────────────────────────────────────

export interface ParseResult<T> {
  ok: true;
  value: T;
}

export interface ParseError {
  ok: false;
  reason: string;
}

/**
 * Parse and validate a certificate payload object.
 * Returns { ok: true, value } on success or { ok: false, reason } on failure.
 */
export function parseCertificatePayload(
  raw: unknown
): ParseResult<CertificatePayload> | ParseError {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "payload must be a non-null object" };
  }
  const p = raw as Record<string, unknown>;

  const required: (keyof CertificatePayload)[] = [
    "certification_id",
    "timestamp",
    "issuer",
    "dataset_hash",
    "algorithm",
    "schema_version",
  ];

  for (const field of required) {
    if (typeof p[field] !== "string" || !p[field]) {
      return { ok: false, reason: `missing or invalid field: ${field}` };
    }
  }

  if (!isSupportedSchemaVersion(p.schema_version as string)) {
    return {
      ok: false,
      reason: `unsupported schema_version "${p.schema_version}". Supported: ${ALL_SCHEMA_VERSIONS.join(", ")}`,
    };
  }

  return { ok: true, value: p as unknown as CertificatePayload };
}

// ── JSON Schema (static) ───────────────────────────────────────────────────────

/** JSON Schema object describing a CertificatePayload (draft-07 compatible) */
export const CERTIFICATE_PAYLOAD_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://certifieddata.io/schemas/certificate-payload.json",
  title: "CertifiedData Certificate Payload",
  description:
    "The payload object that is canonicalized and signed by CertifiedData.io using Ed25519.",
  type: "object",
  required: [
    "certification_id",
    "timestamp",
    "issuer",
    "dataset_hash",
    "algorithm",
    "schema_version",
  ],
  properties: {
    certification_id: {
      type: "string",
      format: "uuid",
      description: "UUID of the certificate",
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "ISO-8601 timestamp of issuance",
    },
    issuer: {
      type: "string",
      description: 'Issuing authority, e.g. "CertifiedData.io"',
    },
    dataset_hash: {
      type: "string",
      description: 'SHA-256 of the certified dataset with algorithm prefix, e.g. "sha256:abc123..."',
    },
    algorithm: {
      type: "string",
      description: 'Generation algorithm, e.g. "CTGAN"',
    },
    rows: {
      type: "integer",
      minimum: 0,
      description: "Number of rows in the synthetic dataset",
    },
    columns: {
      type: "integer",
      minimum: 0,
      description: "Number of columns in the synthetic dataset",
    },
    schema_version: {
      type: "string",
      enum: ALL_SCHEMA_VERSIONS,
      description: "Schema version of this certificate format",
    },
    dataset_name: {
      type: "string",
      description: "Human-readable dataset name",
    },
    artifact_type: {
      type: "string",
      description: 'Artifact type, defaults to "synthetic_dataset"',
    },
    metadata: {
      type: "object",
      description: "Additional metadata key-value pairs",
    },
  },
  additionalProperties: true,
} as const;
