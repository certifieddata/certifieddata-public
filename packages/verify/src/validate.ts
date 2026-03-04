import type { SdaasManifestEnvelope, VerifyResult } from "./types.js";

export function validateEnvelopeShape(envelope: unknown): VerifyResult | null {
  if (!envelope || typeof envelope !== "object") {
    return { verified: false, reason: "Input is not an object" };
  }
  const e = envelope as Record<string, unknown>;

  const sv = e["schema_version"];
  if (sv !== "certifieddata.manifest.v1" && sv !== "sdaas.manifest.v1") {
    return { verified: false, reason: `Unknown schema_version: ${sv}` };
  }
  if (!e["payload"] || typeof e["payload"] !== "object") {
    return { verified: false, reason: "Missing or invalid payload" };
  }
  if (!e["signature"] || typeof e["signature"] !== "object") {
    return { verified: false, reason: "Missing signature object" };
  }

  const sig = e["signature"] as Record<string, unknown>;
  if (typeof sig["alg"] !== "string") {
    return { verified: false, reason: "Missing signature.alg" };
  }
  if (sig["value"] === null || sig["value"] === undefined) {
    return { verified: false, reason: "Missing signature.value" };
  }
  if (sig["alg"] !== "Ed25519") {
    return {
      verified: false,
      alg: sig["alg"] as string,
      key_id: sig["key_id"] as string | null,
      reason: `Unsupported signature algorithm: ${sig["alg"]}. Only Ed25519 is independently verifiable.`,
    };
  }

  return null; // shape is valid
}
