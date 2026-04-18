/**
 * Portable certificate verification for locally-stored artifacts.
 *
 * This module implements the "if certifieddata.io goes away, the zip still
 * verifies" promise. It works fully offline and does not require network
 * access. The caller supplies either:
 *
 *   - a manifest JSON file and a public-key PEM file,
 *   - a directory that contains both (an unpacked bundle),
 *   - a zip bundle containing both.
 *
 * Online helpers (revocation lookup, signing-key discovery) live in
 * @certifieddata/sdk, not here — this package stays offline by design.
 */
import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyManifest } from "./index.js";
import type { VerifyResult } from "./types.js";
import { openZip, readZipEntryByBasename } from "./zip.js";

export interface VerifyFileOptions {
  /**
   * Path to a PEM-encoded Ed25519 public key. If omitted, the verifier will
   * look for a `public_key.pem` next to the manifest file.
   */
  publicKeyPemPath?: string;
  /** Raw PEM string (overrides publicKeyPemPath). */
  publicKeyPem?: string;
  /** Assert the signature key_id matches this value. */
  expectedKeyId?: string;
}

/**
 * Verify a manifest JSON file against a public-key PEM loaded from disk.
 * Runs entirely offline.
 */
export async function verifyManifestFile(
  manifestPath: string,
  opts: VerifyFileOptions = {}
): Promise<VerifyResult> {
  let manifestRaw: string;
  try {
    manifestRaw = readFileSync(resolve(manifestPath), "utf8");
  } catch (err) {
    return { verified: false, reason: `Could not read manifest: ${(err as Error).message}` };
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(manifestRaw);
  } catch (err) {
    return { verified: false, reason: `Manifest is not valid JSON: ${(err as Error).message}` };
  }

  let pem: string | undefined = opts.publicKeyPem;
  if (!pem) {
    const pemPath = opts.publicKeyPemPath
      ? resolve(opts.publicKeyPemPath)
      : resolve(manifestPath, "..", "public_key.pem");
    try {
      pem = readFileSync(pemPath, "utf8");
    } catch (err) {
      return {
        verified: false,
        reason: `Could not read public key at ${pemPath}: ${(err as Error).message}`,
      };
    }
  }

  return verifyManifest(envelope, pem, opts.expectedKeyId);
}

export interface VerifyBundleOptions {
  /** Basename of the manifest JSON inside the bundle. Default: certificate.json. */
  manifestBasename?: string;
  /** Basename of the public key PEM inside the bundle. Default: public_key.pem. */
  publicKeyBasename?: string;
  /** Assert the signature key_id matches this value. */
  expectedKeyId?: string;
}

const DEFAULT_MANIFEST_NAMES = ["certificate.json", "manifest.json"];
const DEFAULT_KEY_NAMES = ["public_key.pem", "key.pem", "signing-key.pem"];

function findFirstFile(dir: string, candidates: string[]): string | null {
  const entries = readdirSync(dir);
  for (const candidate of candidates) {
    if (entries.includes(candidate)) return join(dir, candidate);
  }
  return null;
}

/**
 * Verify an unpacked certificate bundle directory. Fully offline.
 *
 * Expected layout:
 *   <dir>/certificate.json
 *   <dir>/public_key.pem
 */
export async function verifyBundleDirectory(
  dirPath: string,
  opts: VerifyBundleOptions = {}
): Promise<VerifyResult> {
  const absDir = resolve(dirPath);
  let stat;
  try {
    stat = statSync(absDir);
  } catch (err) {
    return { verified: false, reason: `Cannot stat bundle directory: ${(err as Error).message}` };
  }
  if (!stat.isDirectory()) {
    return { verified: false, reason: `${absDir} is not a directory` };
  }

  const manifestCandidates = opts.manifestBasename
    ? [opts.manifestBasename]
    : DEFAULT_MANIFEST_NAMES;
  const keyCandidates = opts.publicKeyBasename
    ? [opts.publicKeyBasename]
    : DEFAULT_KEY_NAMES;

  const manifestPath = findFirstFile(absDir, manifestCandidates);
  if (!manifestPath) {
    return {
      verified: false,
      reason: `No manifest found in ${absDir} (looked for: ${manifestCandidates.join(", ")})`,
    };
  }
  const keyPath = findFirstFile(absDir, keyCandidates);
  if (!keyPath) {
    return {
      verified: false,
      reason: `No public key found in ${absDir} (looked for: ${keyCandidates.join(", ")})`,
    };
  }

  return verifyManifestFile(manifestPath, {
    publicKeyPemPath: keyPath,
    expectedKeyId: opts.expectedKeyId,
  });
}

/**
 * Verify a zipped certificate bundle. Fully offline.
 *
 * Expected contents:
 *   certificate.json
 *   public_key.pem
 *
 * Supports STORE and DEFLATE compression methods.
 */
export async function verifyBundleZip(
  zipPath: string,
  opts: VerifyBundleOptions = {}
): Promise<VerifyResult> {
  let entries;
  try {
    entries = openZip(resolve(zipPath));
  } catch (err) {
    return { verified: false, reason: `Cannot open bundle zip: ${(err as Error).message}` };
  }

  const manifestCandidates = opts.manifestBasename
    ? [opts.manifestBasename]
    : DEFAULT_MANIFEST_NAMES;
  const keyCandidates = opts.publicKeyBasename
    ? [opts.publicKeyBasename]
    : DEFAULT_KEY_NAMES;

  let manifestBuf: Buffer | null = null;
  for (const name of manifestCandidates) {
    manifestBuf = readZipEntryByBasename(entries, name);
    if (manifestBuf) break;
  }
  if (!manifestBuf) {
    return {
      verified: false,
      reason: `No manifest in zip (looked for: ${manifestCandidates.join(", ")})`,
    };
  }

  let keyBuf: Buffer | null = null;
  for (const name of keyCandidates) {
    keyBuf = readZipEntryByBasename(entries, name);
    if (keyBuf) break;
  }
  if (!keyBuf) {
    return {
      verified: false,
      reason: `No public key in zip (looked for: ${keyCandidates.join(", ")})`,
    };
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(manifestBuf.toString("utf8"));
  } catch (err) {
    return { verified: false, reason: `Manifest JSON parse failed: ${(err as Error).message}` };
  }

  return verifyManifest(envelope, keyBuf.toString("utf8"), opts.expectedKeyId);
}
