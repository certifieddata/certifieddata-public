/**
 * Example: Verify a CertifiedData.io certificate manifest from local fixture files.
 *
 * Usage:
 *   node index.mjs [fixture]
 *
 * Where [fixture] is one of:
 *   valid (default)  — should pass
 *   tampered         — should fail (payload changed)
 *   bad_signature    — should fail (random sig)
 *   missing_fields   — should fail (shape error)
 *   wrong_alg        — should fail (unsupported alg)
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyManifest } from "@certifieddata/verify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "fixtures");

const fixtureName = process.argv[2] ?? "valid";
const manifestFile = `manifest.${fixtureName}.json`;

const keypair = JSON.parse(readFileSync(join(fixturesDir, "keypair.test.json"), "utf8"));
const envelope = JSON.parse(readFileSync(join(fixturesDir, manifestFile), "utf8"));

console.log(`\nVerifying: ${manifestFile}`);
console.log(`Using key: ${keypair.key_id}\n`);

const result = await verifyManifest(
  envelope,
  keypair.public_key_pem,
  "test-key-fixture-1"
);

console.log("Result:", result);
process.exit(result.verified ? 0 : 1);
