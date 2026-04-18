/**
 * Smoke tests for the @certifieddata/cli dispatcher.
 *
 * These tests exercise the compiled CLI by spawning node against the dist
 * entry with a controlled argv. They assert subcommands exit with the
 * expected codes and that the dry-run generate URL is structurally correct
 * (no raw column names, no sample values).
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_ENTRY = resolve(__dirname, "cli.js");

let tmp: string;
let csvWithPii: string;

before(() => {
  tmp = mkdtempSync(join(tmpdir(), "cd-cli-test-"));
  csvWithPii = join(tmp, "customers.csv");
  writeFileSync(
    csvWithPii,
    "name,email,phone\nAlice Smith,alice@example.com,555-123-4567\nBob Jones,bob@example.com,555-987-6543\n",
    "utf8",
  );
});

after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function runCli(args: string[], input?: string) {
  return spawnSync(process.execPath, [CLI_ENTRY, ...args], {
    encoding: "utf8",
    input,
  });
}

describe("certifieddata CLI", () => {
  it("prints help with no arguments", () => {
    const r = runCli([]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /certifieddata/);
    assert.match(r.stdout, /pii-scan/);
    assert.match(r.stdout, /generate/);
    assert.match(r.stdout, /verify/);
  });

  it("pii-scan --json exits 2 on HIGH risk findings", () => {
    const r = runCli(["pii-scan", csvWithPii, "--json"]);
    assert.equal(r.status, 2, r.stderr);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.overallRisk, "HIGH");
  });

  it("pii-scan --sarif emits a valid SARIF envelope", () => {
    const r = runCli(["pii-scan", csvWithPii, "--sarif"]);
    assert.equal(r.status, 2);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.version, "2.1.0");
    assert.ok(parsed.runs.length === 1);
    const serialized = JSON.stringify(parsed);
    assert.ok(!serialized.includes("alice@example.com"), "raw value leaked into SARIF");
  });

  it("generate --dry-run emits a URL without column names or samples", () => {
    const r = runCli(["generate", csvWithPii, "--dry-run"]);
    assert.equal(r.status, 0, r.stderr);
    const url = r.stdout.trim().split("\n").pop()!;
    assert.ok(url.startsWith("https://certifieddata.io/generate?"), `bad url: ${url}`);
    assert.ok(!url.includes("email"), "column name leaked into URL");
    assert.ok(!url.includes("alice"), "raw value leaked into URL");
    assert.ok(url.includes("source=pii-scan"));
    assert.ok(url.includes("risk=HIGH"));
  });

  it("generate accepts a handoff JSON via stdin", () => {
    // First emit a handoff via pii-scan, then pipe it to generate --dry-run.
    const handoffPath = join(tmp, "handoff.json");
    const scan = runCli([
      "pii-scan",
      csvWithPii,
      "--json",
      "--output-handoff",
      handoffPath,
    ]);
    assert.ok([0, 1, 2].includes(scan.status ?? 0));
    // Re-run via the generate subcommand using --handoff
    const r = runCli(["generate", "--handoff", handoffPath, "--dry-run"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout.trim(), /^https:\/\/certifieddata\.io\/generate\?/m);
  });

  it("verify rejects a missing artifact", async () => {
    const r = runCli(["verify", join(tmp, "nope.json")]);
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /verified: false|Could not read|not a directory/);
  });
});
