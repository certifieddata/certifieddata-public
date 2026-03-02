#!/usr/bin/env node
/**
 * CertifiedData.io Certificate Verification — standalone CI script
 *
 * Fetches a certificate manifest from certifieddata.io, resolves the signing key,
 * and independently verifies the Ed25519 signature.
 *
 * Exits 0 if verified, 1 if verification fails.
 *
 * Usage:
 *   CERTIFIEDDATA_CERT_ID=<cert-id> node verify.mjs
 *
 * Optional env vars:
 *   CERTIFIEDDATA_BASE_URL       — defaults to https://certifieddata.io
 *   CERTIFIEDDATA_EXPECTED_KEY_ID — if set, asserts the signing key_id matches
 */

const certId = process.env.CERTIFIEDDATA_CERT_ID;
const baseUrl = (process.env.CERTIFIEDDATA_BASE_URL ?? "https://certifieddata.io").replace(/\/$/, "");
const expectedKeyId = process.env.CERTIFIEDDATA_EXPECTED_KEY_ID;

if (!certId) {
  console.error("Error: CERTIFIEDDATA_CERT_ID is required");
  process.exit(1);
}

// ── Canonicalization (must match server implementation) ─────────────────────
function stripUndefined(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === "object") {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) result[k] = stripUndefined(v);
    }
    return result;
  }
  return obj;
}

async function stableStringify(obj) {
  // Use dynamic import so this works with pnpm workspace or npm install
  try {
    const mod = await import("json-stable-stringify");
    return (mod.default ?? mod)(stripUndefined(obj));
  } catch {
    // Fallback: JSON.stringify with sorted keys (adequate for standard payloads)
    return JSON.stringify(stripUndefined(obj), Object.keys(stripUndefined(obj)).sort());
  }
}

// ── Ed25519 verification ─────────────────────────────────────────────────────
import crypto from "node:crypto";

function normalizePem(pem) {
  return pem.replace(/\\n/g, "\n")
    .replace(/(-----BEGIN [A-Z ]+-----)\s+/g, "$1\n")
    .replace(/\s+(-----END [A-Z ]+-----)/g, "\n$1")
    .trim();
}

function verifySignature(payloadBytes, signatureB64, publicKeyPem) {
  const key = crypto.createPublicKey(normalizePem(publicKeyPem));
  const sig = Buffer.from(signatureB64, "base64");
  return crypto.verify(null, payloadBytes, key, sig);
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log(`[certifieddata-verify] cert_id : ${certId}`);
console.log(`[certifieddata-verify] base_url: ${baseUrl}`);

const [manifestRes, keysRes] = await Promise.all([
  fetch(`${baseUrl}/api/cert/${certId}/manifest`, {
    headers: { Accept: "application/sdaas.manifest+json" },
  }),
  fetch(`${baseUrl}/.well-known/signing-keys.json`),
]);

if (!manifestRes.ok) {
  console.error(`[certifieddata-verify] FAIL: manifest fetch returned HTTP ${manifestRes.status}`);
  process.exit(1);
}
if (!keysRes.ok) {
  console.error(`[certifieddata-verify] FAIL: signing-keys fetch returned HTTP ${keysRes.status}`);
  process.exit(1);
}

const envelope = await manifestRes.json();
const keysBody = await keysRes.json();

const { signature, payload } = envelope;
const { alg, key_id, value: signatureB64 } = signature ?? {};

console.log(`[certifieddata-verify] alg    : ${alg}`);
console.log(`[certifieddata-verify] key_id : ${key_id}`);

if (alg !== "Ed25519") {
  console.error(`[certifieddata-verify] FAIL: alg "${alg}" is not independently verifiable`);
  process.exit(1);
}

if (expectedKeyId && key_id !== expectedKeyId) {
  console.error(`[certifieddata-verify] FAIL: key_id "${key_id}" does not match expected "${expectedKeyId}"`);
  process.exit(1);
}

const key = keysBody.keys?.find((k) => k.key_id === key_id);
if (!key) {
  console.error(`[certifieddata-verify] FAIL: no public key found for key_id "${key_id}"`);
  console.error(`[certifieddata-verify] Available keys: ${keysBody.keys?.map((k) => k.key_id).join(", ")}`);
  process.exit(1);
}

if (key.status !== "active") {
  console.error(`[certifieddata-verify] FAIL: signing key "${key_id}" is ${key.status}`);
  process.exit(1);
}

const canonical = await stableStringify(payload);
const payloadBytes = Buffer.from(canonical, "utf8");
const ok = verifySignature(payloadBytes, signatureB64, key.public_key_pem);

if (!ok) {
  console.error("[certifieddata-verify] FAIL: Ed25519 signature verification failed");
  process.exit(1);
}

console.log(`[certifieddata-verify] ✓ VERIFIED — cert_id=${certId} key_id=${key_id}`);
process.exit(0);
