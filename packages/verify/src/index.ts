/**
 * @certifieddata/verify
 *
 * Verify CertifiedData.io certificate manifests independently.
 *
 * Quick start:
 *
 *   import { verifyManifest } from "@certifieddata/verify";
 *
 *   // Fetch from CertifiedData API
 *   const envelope = await fetch(
 *     "https://certifieddata.io/api/cert/<CERT_ID>/manifest",
 *     { headers: { Accept: "application/certifieddata.manifest+json" } }
 *   ).then(r => r.json());
 *
 *   // Fetch public key
 *   const keys = await fetch("https://certifieddata.io/.well-known/signing-keys.json")
 *     .then(r => r.json());
 *   const pubKey = keys.keys.find(k => k.key_id === envelope.signature.key_id);
 *
 *   // Verify
 *   const result = await verifyManifest(envelope, pubKey.public_key_pem);
 *   console.log(result); // { verified: true, alg: "Ed25519", key_id: "..." }
 */

import type { SdaasManifestEnvelope, VerifyResult } from "./types.js";
import { canonicalPayloadBytes } from "./canon.js";
import { verifyEd25519Pem } from "./ed25519.js";
import { validateEnvelopeShape } from "./validate.js";

export type { SdaasManifestEnvelope, SdaasCertPayload, SdaasSignature, VerifyResult } from "./types.js";
export type { CertifiedDataManifestEnvelope, CertifiedDataCertPayload, CertifiedDataSignature } from "./types.js";
export { canonicalPayloadBytes } from "./canon.js";

/**
 * Verify a CertifiedData certificate manifest envelope.
 *
 * @param envelope   Parsed JSON from GET /api/cert/:id/manifest
 * @param publicKeyPem  PEM-formatted Ed25519 public key (from /.well-known/signing-keys.json)
 * @param expectedKeyId  Optional: assert the key_id in the signature matches this value
 */
export async function verifyManifest(
  envelope: unknown,
  publicKeyPem: string,
  expectedKeyId?: string
): Promise<VerifyResult> {
  const shapeErr = validateEnvelopeShape(envelope);
  if (shapeErr) return shapeErr;

  const e = envelope as SdaasManifestEnvelope;
  const { alg, key_id, value: signatureB64 } = e.signature;

  if (expectedKeyId && key_id !== expectedKeyId) {
    return {
      verified: false,
      alg,
      key_id,
      reason: `key_id mismatch: expected "${expectedKeyId}", got "${key_id}"`,
    };
  }

  if (!signatureB64) {
    return { verified: false, alg, key_id, reason: "signature.value is null" };
  }

  const payloadBytes = canonicalPayloadBytes(e.payload);

  try {
    const ok = verifyEd25519Pem({
      payloadBytes,
      signatureB64,
      publicKeyPem,
    });
    if (!ok) return { verified: false, alg, key_id, reason: "Signature verification failed" };
    return { verified: true, alg, key_id };
  } catch (err) {
    return { verified: false, alg, key_id, reason: (err as Error).message };
  }
}
