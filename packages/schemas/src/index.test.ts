/**
 * Unit tests for @certifieddata/schemas
 *
 * Uses Node.js built-in test runner (node:test).
 * Run after build: node --test dist/index.test.js
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVE_SCHEMA_VERSION,
  ALL_SCHEMA_VERSIONS,
  DEPRECATED_SCHEMA_VERSIONS,
  isSupportedSchemaVersion,
  isDeprecatedSchemaVersion,
  parseCertificatePayload,
} from "./index.js";

const VALID_PAYLOAD = {
  certificate_id: "550e8400-e29b-41d4-a716-446655440000",
  issued_at:      "2026-03-30T00:00:00.000Z",
  issuer:         "CertifiedData.io",
  dataset_hash:   "sha256:a1b2c3d4e5f6",
  algorithm:      "CTGAN",
  schema_version: "cert.v2",
};

describe("version constants", () => {
  test("ACTIVE_SCHEMA_VERSION is cert.v2", () => {
    assert.equal(ACTIVE_SCHEMA_VERSION, "cert.v2");
  });

  test("ALL_SCHEMA_VERSIONS contains v1 and v2", () => {
    assert.ok((ALL_SCHEMA_VERSIONS as readonly string[]).includes("cert.v1"));
    assert.ok((ALL_SCHEMA_VERSIONS as readonly string[]).includes("cert.v2"));
  });

  test("DEPRECATED_SCHEMA_VERSIONS contains v1 but not v2", () => {
    assert.ok((DEPRECATED_SCHEMA_VERSIONS as readonly string[]).includes("cert.v1"));
    assert.ok(!(DEPRECATED_SCHEMA_VERSIONS as readonly string[]).includes("cert.v2"));
  });
});

describe("isSupportedSchemaVersion", () => {
  test("returns true for cert.v1", () => {
    assert.equal(isSupportedSchemaVersion("cert.v1"), true);
  });

  test("returns true for cert.v2", () => {
    assert.equal(isSupportedSchemaVersion("cert.v2"), true);
  });

  test("returns false for unknown version", () => {
    assert.equal(isSupportedSchemaVersion("cert.v0"), false);
    assert.equal(isSupportedSchemaVersion(""), false);
    assert.equal(isSupportedSchemaVersion("v2"), false);
  });
});

describe("isDeprecatedSchemaVersion", () => {
  test("cert.v1 is deprecated", () => {
    assert.equal(isDeprecatedSchemaVersion("cert.v1"), true);
  });

  test("cert.v2 is not deprecated", () => {
    assert.equal(isDeprecatedSchemaVersion("cert.v2"), false);
  });

  test("unknown version is not deprecated", () => {
    assert.equal(isDeprecatedSchemaVersion("cert.v99"), false);
  });
});

describe("parseCertificatePayload", () => {
  test("parses a valid payload", () => {
    const result = parseCertificatePayload(VALID_PAYLOAD);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.certificate_id, VALID_PAYLOAD.certificate_id);
      assert.equal(result.value.issued_at, VALID_PAYLOAD.issued_at);
      assert.equal(result.value.schema_version, "cert.v2");
    }
  });

  test("accepts cert.v1 schema_version", () => {
    const result = parseCertificatePayload({ ...VALID_PAYLOAD, schema_version: "cert.v1" });
    assert.equal(result.ok, true);
  });

  test("rejects missing certificate_id", () => {
    const { certificate_id: _omit, ...rest } = VALID_PAYLOAD;
    const result = parseCertificatePayload(rest);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /certificate_id/);
  });

  test("rejects missing issued_at", () => {
    const { issued_at: _omit, ...rest } = VALID_PAYLOAD;
    const result = parseCertificatePayload(rest);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /issued_at/);
  });

  test("rejects missing issuer", () => {
    const { issuer: _omit, ...rest } = VALID_PAYLOAD;
    const result = parseCertificatePayload(rest);
    assert.equal(result.ok, false);
  });

  test("rejects missing dataset_hash", () => {
    const { dataset_hash: _omit, ...rest } = VALID_PAYLOAD;
    const result = parseCertificatePayload(rest);
    assert.equal(result.ok, false);
  });

  test("rejects missing algorithm", () => {
    const { algorithm: _omit, ...rest } = VALID_PAYLOAD;
    const result = parseCertificatePayload(rest);
    assert.equal(result.ok, false);
  });

  test("rejects unsupported schema_version", () => {
    const result = parseCertificatePayload({ ...VALID_PAYLOAD, schema_version: "cert.v99" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /unsupported schema_version/);
  });

  test("rejects null input", () => {
    const result = parseCertificatePayload(null);
    assert.equal(result.ok, false);
  });

  test("rejects array input", () => {
    const result = parseCertificatePayload([VALID_PAYLOAD]);
    assert.equal(result.ok, false);
  });

  test("rejects string input", () => {
    const result = parseCertificatePayload("{}");
    assert.equal(result.ok, false);
  });

  test("preserves optional fields when present", () => {
    const payload = {
      ...VALID_PAYLOAD,
      rows:         10000,
      columns:      42,
      dataset_name: "test-dataset",
      artifact_type: "synthetic_dataset",
    };
    const result = parseCertificatePayload(payload);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.rows, 10000);
      assert.equal(result.value.dataset_name, "test-dataset");
    }
  });
});
