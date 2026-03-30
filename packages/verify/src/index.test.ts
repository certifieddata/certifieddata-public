/**
 * Unit tests for @certifieddata/verify
 *
 * Uses Node.js built-in test runner (node:test).
 * Run after build: node --test dist/index.test.js
 *
 * Fixtures from ../../examples/fixtures/ (relative to compiled dist/)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyManifest, canonicalPayloadBytes } from "./index.js";

// Path resolution: dist/index.test.js → ../../../examples/fixtures
const __dir = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dir, "../../../examples/fixtures");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES, name), "utf8"));
}

const keypair = loadFixture("keypair.test.json") as {
  key_id: string;
  public_key_pem: string;
};

const validManifest     = loadFixture("manifest.valid.json");
const tamperedManifest  = loadFixture("manifest.tampered.json");
const badSigManifest    = loadFixture("manifest.bad_signature.json");
const missingFields     = loadFixture("manifest.missing_fields.json");
const wrongAlg          = loadFixture("manifest.wrong_alg.json");

describe("verifyManifest", () => {
  test("verifies a valid signed manifest", async () => {
    const result = await verifyManifest(validManifest, keypair.public_key_pem, keypair.key_id);
    assert.equal(result.verified, true);
    if (result.verified) {
      assert.equal(result.alg, "Ed25519");
      assert.equal(result.key_id, keypair.key_id);
    }
  });

  test("rejects a tampered payload (row_count changed)", async () => {
    const result = await verifyManifest(tamperedManifest, keypair.public_key_pem, keypair.key_id);
    assert.equal(result.verified, false);
    assert.ok("reason" in result, "should include a reason");
  });

  test("rejects a bad (random) signature", async () => {
    const result = await verifyManifest(badSigManifest, keypair.public_key_pem, keypair.key_id);
    assert.equal(result.verified, false);
  });

  test("rejects missing_fields manifest", async () => {
    const result = await verifyManifest(missingFields, keypair.public_key_pem);
    assert.equal(result.verified, false);
    assert.ok("reason" in result);
  });

  test("rejects wrong_alg manifest", async () => {
    const result = await verifyManifest(wrongAlg, keypair.public_key_pem);
    assert.equal(result.verified, false);
    assert.ok("reason" in result);
  });

  test("rejects when key_id mismatch", async () => {
    const result = await verifyManifest(validManifest, keypair.public_key_pem, "wrong-key-id");
    assert.equal(result.verified, false);
    if (!result.verified) {
      assert.match(result.reason ?? "", /key_id mismatch/);
    }
  });

  test("rejects null input", async () => {
    const result = await verifyManifest(null, keypair.public_key_pem);
    assert.equal(result.verified, false);
  });

  test("rejects non-object input", async () => {
    const result = await verifyManifest("not-an-object", keypair.public_key_pem);
    assert.equal(result.verified, false);
  });
});

describe("canonicalPayloadBytes", () => {
  test("returns a Uint8Array for a valid payload object", () => {
    const payload = { b: 2, a: 1, c: "hello" };
    const bytes = canonicalPayloadBytes(payload);
    assert.ok(bytes instanceof Uint8Array);
    assert.ok(bytes.length > 0);
  });

  test("produces stable output — same payload always produces same bytes", () => {
    const p1 = { z: "last", a: "first" };
    const p2 = { a: "first", z: "last" }; // different key order
    const b1 = canonicalPayloadBytes(p1);
    const b2 = canonicalPayloadBytes(p2);
    assert.deepEqual(b1, b2);
  });

  test("canonical form is alphabetically sorted JSON", () => {
    const payload = { z: "z", a: "a" };
    const bytes = canonicalPayloadBytes(payload);
    const json = new TextDecoder().decode(bytes);
    assert.equal(json, '{"a":"a","z":"z"}');
  });
});
