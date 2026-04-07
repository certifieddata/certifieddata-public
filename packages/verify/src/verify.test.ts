/**
 * @certifieddata/verify — unit tests
 *
 * Tests verifyManifest() and canonicalPayloadBytes() using the fixture files
 * in examples/fixtures/ to keep tests fully offline.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { verifyManifest, canonicalPayloadBytes } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fixture paths relative to dist/ output → src/ → package root → repo root → examples/fixtures/
const FIXTURES_DIR = resolve(__dirname, "../../../examples/fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, name), "utf8"));
}

const keypair = loadFixture("keypair.test.json") as {
  public_key_pem: string;
  private_key_pem: string;
  key_id: string;
};

// ── verifyManifest — valid manifest ──────────────────────────────────────────

describe("verifyManifest — valid manifest", () => {
  it("returns verified: true for the valid fixture", async () => {
    const envelope = loadFixture("manifest.valid.json");
    const result = await verifyManifest(envelope, keypair.public_key_pem);
    assert.equal(result.verified, true, `Expected verified: true, got: ${JSON.stringify(result)}`);
    assert.equal(result.alg, "Ed25519");
    assert.equal(result.key_id, keypair.key_id);
    assert.ok(!("reason" in result && result.reason), "Should have no reason on success");
  });

  it("returns verified: true when expectedKeyId matches", async () => {
    const envelope = loadFixture("manifest.valid.json");
    const result = await verifyManifest(envelope, keypair.public_key_pem, keypair.key_id);
    assert.equal(result.verified, true);
  });

  it("returns verified: false when expectedKeyId mismatches", async () => {
    const envelope = loadFixture("manifest.valid.json");
    const result = await verifyManifest(envelope, keypair.public_key_pem, "wrong-key-id");
    assert.equal(result.verified, false);
    assert.ok(result.reason?.includes("key_id mismatch") ?? false,
      `Expected key_id mismatch reason, got: ${result.reason}`);
  });
});

// ── verifyManifest — tampered payload ────────────────────────────────────────

describe("verifyManifest — tampered payload", () => {
  it("returns verified: false for manifest with modified payload", async () => {
    const envelope = loadFixture("manifest.tampered.json");
    const result = await verifyManifest(envelope, keypair.public_key_pem);
    assert.equal(result.verified, false,
      `Expected verified: false for tampered payload, got: ${JSON.stringify(result)}`);
  });
});

// ── verifyManifest — bad signature ───────────────────────────────────────────

describe("verifyManifest — bad signature", () => {
  it("returns verified: false when signature bytes are invalid", async () => {
    const envelope = loadFixture("manifest.bad_signature.json");
    const result = await verifyManifest(envelope, keypair.public_key_pem);
    assert.equal(result.verified, false,
      `Expected verified: false for bad signature, got: ${JSON.stringify(result)}`);
  });
});

// ── verifyManifest — missing fields ──────────────────────────────────────────

describe("verifyManifest — missing required fields", () => {
  it("returns verified: false for manifest missing signature field", async () => {
    const envelope = loadFixture("manifest.missing_fields.json");
    const result = await verifyManifest(envelope, keypair.public_key_pem);
    assert.equal(result.verified, false,
      `Expected verified: false for missing fields, got: ${JSON.stringify(result)}`);
  });

  it("returns verified: false for null envelope", async () => {
    const result = await verifyManifest(null, keypair.public_key_pem);
    assert.equal(result.verified, false);
  });

  it("returns verified: false for empty object", async () => {
    const result = await verifyManifest({}, keypair.public_key_pem);
    assert.equal(result.verified, false);
  });
});

// ── canonicalPayloadBytes ─────────────────────────────────────────────────────

describe("canonicalPayloadBytes", () => {
  it("is deterministic — same input produces same output", () => {
    const payload = { b: 2, a: 1, c: { z: 3, y: 4 } };
    const bytes1 = canonicalPayloadBytes(payload);
    const bytes2 = canonicalPayloadBytes(payload);
    assert.deepEqual(bytes1, bytes2);
  });

  it("sorts keys consistently regardless of insertion order", () => {
    const p1 = { z: 1, a: 2, m: 3 };
    const p2 = { m: 3, z: 1, a: 2 };
    const bytes1 = canonicalPayloadBytes(p1);
    const bytes2 = canonicalPayloadBytes(p2);
    assert.deepEqual(bytes1, bytes2, "Key-order variants should produce identical bytes");
  });

  it("strips undefined values", () => {
    const p1 = { a: 1, b: undefined };
    const p2 = { a: 1 };
    const bytes1 = canonicalPayloadBytes(p1);
    const bytes2 = canonicalPayloadBytes(p2);
    assert.deepEqual(bytes1, bytes2, "Undefined values should be stripped before hashing");
  });

  it("returns a Buffer", () => {
    const result = canonicalPayloadBytes({ test: true });
    assert.ok(Buffer.isBuffer(result), "Expected Buffer return type");
  });

  it("valid fixture payload canonicalizes without throwing", () => {
    const envelope = loadFixture("manifest.valid.json") as { payload: unknown };
    assert.doesNotThrow(() => canonicalPayloadBytes(envelope.payload));
  });
});
