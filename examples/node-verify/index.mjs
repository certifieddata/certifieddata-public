/**
 * examples/node-verify
 *
 * Independent certificate verification in Node.js using @certifieddata/verify.
 * Fetches the signed manifest and public key from the CertifiedData API and
 * verifies the Ed25519 signature without trusting the server response.
 *
 * Run:
 *   CERT_ID=your-cert-uuid node index.mjs
 *
 * Or against a local fixture:
 *   node index.mjs --fixture
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyManifest, canonicalPayloadBytes } from "@certifieddata/verify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const useFixture = process.argv.includes("--fixture");
const BASE = "https://certifieddata.io";

async function verifyLive(certId) {
  console.log(`\nVerifying certificate: ${certId}\n`);

  // 1. Fetch the signed manifest envelope
  console.log("1. Fetching signed manifest...");
  const manifestRes = await fetch(`${BASE}/api/cert/${certId}/manifest`, {
    headers: { Accept: "application/certifieddata.manifest+json" },
  });
  if (!manifestRes.ok) throw new Error(`fetchManifest failed: HTTP ${manifestRes.status}`);
  const envelope = await manifestRes.json();
  console.log("   schema_version:", envelope.payload?.schema_version);
  console.log("   key_id:        ", envelope.signature?.key_id);

  // 2. Fetch the public signing keys
  console.log("\n2. Fetching public signing keys...");
  const keysRes = await fetch(`${BASE}/.well-known/signing-keys.json`);
  if (!keysRes.ok) throw new Error(`fetchSigningKeys failed: HTTP ${keysRes.status}`);
  const keysDoc = await keysRes.json();
  const keyId = envelope.signature?.key_id;
  const key = keysDoc.keys?.find((k) => k.key_id === keyId);
  if (!key) throw new Error(`No public key found for key_id="${keyId}"`);
  console.log("   found key:     ", keyId, " status:", key.status);

  if (key.status !== "active") {
    console.error(`\nSigning key "${keyId}" is ${key.status} — cannot verify.`);
    process.exit(1);
  }

  // 3. Verify Ed25519 signature independently
  console.log("\n3. Verifying Ed25519 signature...");
  return { envelope, result: await verifyManifest(envelope, key.public_key_pem, keyId) };
}

async function verifyFromFixture() {
  console.log("\nVerifying from local fixture...\n");
  const fixturesDir = join(__dirname, "..", "fixtures");
  const keypair = JSON.parse(readFileSync(join(fixturesDir, "keypair.test.json"), "utf8"));
  const envelope = JSON.parse(readFileSync(join(fixturesDir, "manifest.valid.json"), "utf8"));
  console.log("   key_id:", keypair.key_id);
  const result = await verifyManifest(envelope, keypair.public_key_pem, keypair.key_id);
  return { envelope, result };
}

async function main() {
  let envelope, result;

  if (useFixture) {
    ({ envelope, result } = await verifyFromFixture());
  } else {
    const certId = process.env.CERT_ID;
    if (!certId) {
      console.error("Usage: CERT_ID=<uuid> node index.mjs");
      console.error("       node index.mjs --fixture   (uses local test fixtures)");
      process.exit(1);
    }
    ({ envelope, result } = await verifyLive(certId));
  }

  console.log("\n─────────────────────────────────────");
  if (result.verified) {
    console.log("VERIFIED");
    console.log("  Algorithm:", result.alg);
    console.log("  Key ID:   ", result.key_id);
  } else {
    console.log("VERIFICATION FAILED");
    console.log("  Reason:", result.reason);
    process.exit(1);
  }
  console.log("─────────────────────────────────────\n");

  const payloadBytes = canonicalPayloadBytes(envelope.payload);
  console.log("Canonical payload (hex, first 32 bytes):", Buffer.from(payloadBytes).toString("hex").slice(0, 64) + "...");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
