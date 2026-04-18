/**
 * Minimal read-only zip reader used by the bundle verifier.
 *
 * Supports the two compression methods real certificate bundles use:
 *   - 0  (STORE)   — uncompressed
 *   - 8  (DEFLATE) — raw deflate via node:zlib
 *
 * Intentionally tiny: we do not depend on a third-party zip library. This keeps
 * @certifieddata/verify portable for offline, long-term-archival verification.
 *
 * If a certificate bundle uses an exotic compression method (BZIP2, LZMA, ZIP64,
 * encrypted entries), this reader will refuse the entry. Such bundles are not a
 * supported long-term archive format for certifieddata.
 */
import { inflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";

export interface ZipEntry {
  name: string;
  read: () => Buffer;
}

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

function findEocd(buf: Buffer): number {
  // EOCD is within the last ~64KB + 22 bytes. Scan backwards.
  const maxBack = Math.min(buf.length, 0x10000 + 22);
  for (let i = buf.length - 22; i >= buf.length - maxBack; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  throw new Error("Not a zip file (no EOCD signature found)");
}

export function openZip(filePath: string): ZipEntry[] {
  const buf = readFileSync(filePath);
  const eocd = findEocd(buf);
  const cenCount = buf.readUInt16LE(eocd + 10);
  const cenOffset = buf.readUInt32LE(eocd + 16);

  if (cenOffset === 0xffffffff) {
    throw new Error("ZIP64 archives are not supported by this reader");
  }

  const entries: ZipEntry[] = [];
  let p = cenOffset;
  for (let i = 0; i < cenCount; i++) {
    if (buf.readUInt32LE(p) !== CEN_SIG) {
      throw new Error("Malformed zip central directory");
    }
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const locOffset = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString("utf8");
    p += 46 + nameLen + extraLen + commentLen;

    // Snapshot fields for the closure.
    const capturedMethod = method;
    const capturedCompSize = compSize;
    const capturedUncompSize = uncompSize;
    const capturedLoc = locOffset;
    const capturedName = name;

    entries.push({
      name,
      read: () => {
        if (buf.readUInt32LE(capturedLoc) !== LOC_SIG) {
          throw new Error(`Malformed zip local header for ${capturedName}`);
        }
        const locNameLen = buf.readUInt16LE(capturedLoc + 26);
        const locExtraLen = buf.readUInt16LE(capturedLoc + 28);
        const dataStart = capturedLoc + 30 + locNameLen + locExtraLen;
        const dataEnd = dataStart + capturedCompSize;
        const raw = buf.slice(dataStart, dataEnd);

        if (capturedMethod === 0) return Buffer.from(raw);
        if (capturedMethod === 8) {
          const out = inflateRawSync(raw);
          if (out.length !== capturedUncompSize) {
            throw new Error(
              `Uncompressed size mismatch for ${capturedName}: expected ${capturedUncompSize}, got ${out.length}`
            );
          }
          return out;
        }
        throw new Error(
          `Unsupported compression method ${capturedMethod} for entry ${capturedName}`
        );
      },
    });
  }
  return entries;
}

export function readZipEntryByBasename(
  entries: ZipEntry[],
  basename: string
): Buffer | null {
  const match = entries.find((e) => {
    const parts = e.name.split("/");
    return parts[parts.length - 1] === basename;
  });
  return match ? match.read() : null;
}
