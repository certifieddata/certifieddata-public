/**
 * @certifieddata/verify — bundle tests
 *
 * Exercises the offline bundle verifiers (directory + zip) against a
 * transient bundle built from the existing fixture keypair + manifest.
 * All I/O is filesystem-local — no network calls.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  verifyManifestFile,
  verifyBundleDirectory,
  verifyBundleZip,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = resolve(__dirname, "../../../examples/fixtures");

const keypair = JSON.parse(readFileSync(resolve(FIXTURES_DIR, "keypair.test.json"), "utf8")) as {
  public_key_pem: string;
  key_id: string;
};
const validManifestRaw = readFileSync(resolve(FIXTURES_DIR, "manifest.valid.json"), "utf8");

let tmpRoot: string;
let bundleDir: string;
let manifestPath: string;
let keyPath: string;
let storedZipPath: string;
let deflatedZipPath: string;

/** Build a minimal zip with a single stored or deflated entry. */
function buildZip(entries: { name: string; content: Buffer; deflate: boolean }[]): Buffer {
  const localRecords: Buffer[] = [];
  const centralRecords: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const uncompSize = entry.content.length;
    const method = entry.deflate ? 8 : 0;
    const data = entry.deflate ? deflateRawSync(entry.content) : entry.content;
    const compSize = data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0, 12); // mod date
    local.writeUInt32LE(0, 14); // crc32 (ignored by our reader)
    local.writeUInt32LE(compSize, 18);
    local.writeUInt32LE(uncompSize, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    localRecords.push(Buffer.concat([local, nameBuf, data]));

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(0, 16); // crc32
    central.writeUInt32LE(compSize, 20);
    central.writeUInt32LE(uncompSize, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);

    centralRecords.push(Buffer.concat([central, nameBuf]));
    localOffset += localRecords[localRecords.length - 1].length;
  }

  const localZone = Buffer.concat(localRecords);
  const centralZone = Buffer.concat(centralRecords);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralZone.length, 12);
  eocd.writeUInt32LE(localZone.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localZone, centralZone, eocd]);
}

before(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "cd-bundle-test-"));
  bundleDir = join(tmpRoot, "bundle");
  mkdirSync(bundleDir, { recursive: true });
  manifestPath = join(bundleDir, "certificate.json");
  keyPath = join(bundleDir, "public_key.pem");
  writeFileSync(manifestPath, validManifestRaw, "utf8");
  writeFileSync(keyPath, keypair.public_key_pem, "utf8");

  const manifestBuf = Buffer.from(validManifestRaw, "utf8");
  const keyBuf = Buffer.from(keypair.public_key_pem, "utf8");

  storedZipPath = join(tmpRoot, "bundle-stored.zip");
  writeFileSync(
    storedZipPath,
    buildZip([
      { name: "certificate.json", content: manifestBuf, deflate: false },
      { name: "public_key.pem", content: keyBuf, deflate: false },
    ])
  );

  deflatedZipPath = join(tmpRoot, "bundle-deflated.zip");
  writeFileSync(
    deflatedZipPath,
    buildZip([
      { name: "certificate.json", content: manifestBuf, deflate: true },
      { name: "public_key.pem", content: keyBuf, deflate: true },
    ])
  );
});

after(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("verifyManifestFile", () => {
  it("verifies a manifest JSON file using an explicit key path", async () => {
    const result = await verifyManifestFile(manifestPath, { publicKeyPemPath: keyPath });
    assert.equal(result.verified, true, JSON.stringify(result));
  });

  it("falls back to public_key.pem next to the manifest", async () => {
    const result = await verifyManifestFile(manifestPath);
    assert.equal(result.verified, true);
  });

  it("accepts a raw PEM string via publicKeyPem option", async () => {
    const result = await verifyManifestFile(manifestPath, {
      publicKeyPem: keypair.public_key_pem,
    });
    assert.equal(result.verified, true);
  });

  it("returns verified: false when manifest is missing", async () => {
    const result = await verifyManifestFile(join(tmpRoot, "nope.json"));
    assert.equal(result.verified, false);
    assert.ok(result.reason?.includes("Could not read manifest"));
  });
});

describe("verifyBundleDirectory", () => {
  it("auto-discovers certificate.json and public_key.pem", async () => {
    const result = await verifyBundleDirectory(bundleDir);
    assert.equal(result.verified, true, JSON.stringify(result));
  });

  it("returns verified: false for non-directory input", async () => {
    const result = await verifyBundleDirectory(manifestPath);
    assert.equal(result.verified, false);
    assert.ok(result.reason?.includes("not a directory"));
  });
});

describe("verifyBundleZip", () => {
  it("verifies a STORE-compressed bundle zip", async () => {
    const result = await verifyBundleZip(storedZipPath);
    assert.equal(result.verified, true, JSON.stringify(result));
  });

  it("verifies a DEFLATE-compressed bundle zip", async () => {
    const result = await verifyBundleZip(deflatedZipPath);
    assert.equal(result.verified, true, JSON.stringify(result));
  });

  it("returns verified: false when the zip is missing entries", async () => {
    const incompletePath = join(tmpRoot, "incomplete.zip");
    writeFileSync(
      incompletePath,
      buildZip([{ name: "certificate.json", content: Buffer.from(validManifestRaw), deflate: false }])
    );
    const result = await verifyBundleZip(incompletePath);
    assert.equal(result.verified, false);
    assert.ok(result.reason?.includes("No public key in zip"));
  });
});
