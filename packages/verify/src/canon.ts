/**
 * Canonicalization for CertifiedData manifest payloads.
 *
 * Matches the server-side implementation exactly:
 *   1. Strip undefined values (recursively)
 *   2. Stable-sort keys at every level (json-stable-stringify)
 *   3. Encode as UTF-8
 *
 * This is NOT the same as RFC 8785 JCS in all edge cases (e.g. numeric
 * representation). If in doubt, compare against json-stable-stringify output.
 */
import stableStringify from "json-stable-stringify";

function stripUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== undefined) {
        result[key] = stripUndefined(value);
      }
    }
    return result;
  }
  return obj;
}

export function canonicalPayloadBytes(payload: unknown): Buffer {
  const cleaned = stripUndefined(payload);
  const s = stableStringify(cleaned);
  if (typeof s !== "string") throw new Error("Canonicalization failed");
  return Buffer.from(s, "utf8");
}
