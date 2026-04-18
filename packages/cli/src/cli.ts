#!/usr/bin/env node
/**
 * @certifieddata/cli — unified command-line entrypoint.
 *
 * Subcommands:
 *   certifieddata pii-scan <file> [flags]       scan a dataset for PII
 *   certifieddata generate <file|handoff>       open a generation workflow
 *                                               (web handoff — no raw data
 *                                               is transmitted)
 *   certifieddata verify <manifest|bundle>      verify a manifest or bundle
 *                                               offline
 *   certifieddata registry [--type T]           browse the public registry
 *
 * Privacy and IP posture:
 *   - pii-scan stays 100% local, identical to @certifieddata/pii-scan.
 *   - generate never uploads file contents. It reads a handoff summary or
 *     computes one from a scan, then launches a browser at a public URL
 *     carrying only aggregate counts.
 *   - verify is fully offline against a locally-supplied key or bundle.
 *   - registry uses only the documented public API (SDK).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import {
  scanContent,
  buildHandoff,
  buildSarif,
  type ScanResult,
  type HandoffSummary,
} from "@certifieddata/pii-scan";
import {
  verifyManifestFile,
  verifyBundleDirectory,
  verifyBundleZip,
  type VerifyResult,
} from "@certifieddata/verify";
import { CertifiedDataClient } from "@certifieddata/sdk";

const PACKAGE_VERSION = "0.1.0";

type Argv = string[];

function flagValue(argv: Argv, name: string): string | undefined {
  const eq = argv.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = argv.indexOf(name);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith("--")) return argv[idx + 1];
  return undefined;
}

function hasFlag(argv: Argv, ...names: string[]): boolean {
  return names.some((n) => argv.includes(n));
}

function positional(argv: Argv, valueFlags: Set<string>): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) continue;
    const prev = argv[i - 1];
    if (prev && valueFlags.has(prev) && !prev.includes("=")) continue;
    return a;
  }
  return undefined;
}

function printTopLevelHelp(): void {
  console.log(
    `
certifieddata — unified CertifiedData.io CLI

Usage:
  certifieddata <command> [options]

Commands:
  pii-scan <file>          Scan a CSV or JSON file for likely PII (local only)
  generate <file|handoff>  Open the certified-synthetic generation workflow
                           via a web handoff. No file contents are uploaded
                           by this command.
  verify <artifact>        Verify a manifest JSON or an unpacked / zipped
                           certificate bundle, fully offline
  registry                 Browse the public CertifiedData registry
  help                     Show this help
  version                  Print the CLI version

Run "certifieddata <command> --help" for command-specific flags.

Privacy:
  pii-scan and verify never make network calls. generate opens a browser but
  does not transmit file contents. Raw samples never leave your machine
  through this CLI.
`.trim(),
  );
}

// ── pii-scan ────────────────────────────────────────────────────────────────

function runPiiScan(argv: Argv): number {
  if (hasFlag(argv, "--help", "-h")) {
    console.log(
      `
certifieddata pii-scan <file> [options]

Options:
  --json                   Output findings as JSON
  --sarif                  Output findings as SARIF 2.1.0
  --emit-handoff           Print a sanitized handoff summary JSON
  --output-handoff <path>  Write a handoff JSON to disk
  --open-generate          Open the continue-generation URL in a browser
  --base-url <url>         Handoff base URL (default: https://certifieddata.io)
  --no-color               Disable colored output

Privacy: this command runs fully locally. With --open-generate, only
aggregate counts are sent via URL params.
`.trim(),
    );
    return 0;
  }

  const valueFlags = new Set(["--output-handoff", "--base-url"]);
  const filePath = positional(argv, valueFlags);
  if (!filePath) {
    console.error("pii-scan: missing <file> argument. Run with --help.");
    return 2;
  }

  const jsonOutput = hasFlag(argv, "--json");
  const sarifOutput = hasFlag(argv, "--sarif");
  const emitHandoff = hasFlag(argv, "--emit-handoff");
  const openGenerate = hasFlag(argv, "--open-generate");
  const outputHandoffPath = flagValue(argv, "--output-handoff");
  const baseUrl = flagValue(argv, "--base-url") ?? "https://certifieddata.io";

  let content: string;
  try {
    content = readFileSync(resolve(filePath), "utf8");
  } catch (err) {
    console.error(`pii-scan: cannot read ${filePath}: ${(err as Error).message}`);
    return 1;
  }

  const result: ScanResult = scanContent(content, resolve(filePath));
  const exitCode = result.overallRisk === "HIGH" ? 2 : result.findings.length > 0 ? 1 : 0;

  const handoff = emitHandoff || openGenerate || outputHandoffPath
    ? buildHandoff(result, { baseUrl, sourceVersion: PACKAGE_VERSION })
    : null;

  if (handoff && outputHandoffPath) {
    writeFileSync(resolve(outputHandoffPath), JSON.stringify(handoff, null, 2) + "\n", "utf8");
  }

  if (sarifOutput) {
    const sarif = buildSarif(result, { toolVersion: PACKAGE_VERSION });
    process.stdout.write(JSON.stringify(sarif, null, 2) + "\n");
    if (handoff && openGenerate) openInBrowser(handoff.continue_url);
    return exitCode;
  }

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (handoff && openGenerate) openInBrowser(handoff.continue_url);
    return exitCode;
  }

  printHumanScanSummary(result);

  if (handoff) {
    if (outputHandoffPath) console.log(`  Handoff written: ${resolve(outputHandoffPath)}`);
    if (emitHandoff) {
      console.log("  Handoff:");
      process.stdout.write(JSON.stringify(handoff, null, 2) + "\n");
    }
    if (openGenerate) openInBrowser(handoff.continue_url);
  }

  return exitCode;
}

function printHumanScanSummary(result: ScanResult): void {
  console.log("");
  console.log(`pii-scan — ${result.file}`);
  console.log(`  Rows:     ${result.rowsScanned.toLocaleString()}`);
  console.log(`  Columns:  ${result.columnsScanned}`);
  console.log(`  Findings: ${result.findings.length}`);
  console.log(`  Risk:     ${result.overallRisk}`);
  console.log("");
  if (result.findings.length === 0) {
    console.log("  No PII patterns detected. Review manually before use.");
    return;
  }
  for (const f of result.findings) {
    console.log(`  [${f.risk}] ${f.column} — ${f.patternName} (${f.source})`);
  }
  console.log("");
  console.log("  " + result.summary);
  console.log("");
  console.log("  Diagnostic aid only. Not a compliance control.");
}

// ── generate (web handoff only — no proprietary API surface) ─────────────────

function runGenerate(argv: Argv): number {
  if (hasFlag(argv, "--help", "-h")) {
    console.log(
      `
certifieddata generate <file-or-handoff> [options]

Open the certified-synthetic generation workflow for a dataset.

This command does NOT upload your dataset. It either:
  (a) reads a pii-scan handoff JSON and opens the generation URL, or
  (b) reads a dataset file, scans it locally, builds a sanitized handoff,
      and opens the generation URL with aggregate counts.

To complete generation, sign in on the web. Use your CertifiedData.io
account and API key via the hosted API for programmatic uploads — this
CLI deliberately does not embed a hosted upload flow to keep the public
repository free of proprietary API details.

Options:
  --handoff <path>         Read an existing handoff JSON
  --dry-run                Print the continue URL instead of opening it
  --base-url <url>         Override the generation base URL
                           (default: https://certifieddata.io)
  --no-open                Alias for --dry-run
`.trim(),
    );
    return 0;
  }

  const valueFlags = new Set(["--handoff", "--base-url"]);
  const positionalArg = positional(argv, valueFlags);
  const handoffPath = flagValue(argv, "--handoff") ?? (positionalArg && isHandoffFilename(positionalArg) ? positionalArg : undefined);
  const baseUrl = flagValue(argv, "--base-url") ?? "https://certifieddata.io";
  const dryRun = hasFlag(argv, "--dry-run", "--no-open");

  let handoff: HandoffSummary | null = null;

  if (handoffPath) {
    try {
      const raw = readFileSync(resolve(handoffPath), "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.schema_version !== "pii-scan.handoff.v1") {
        console.error(
          `generate: ${handoffPath} is not a pii-scan.handoff.v1 document ` +
            `(schema_version=${parsed?.schema_version ?? "missing"})`,
        );
        return 1;
      }
      handoff = parsed as HandoffSummary;
    } catch (err) {
      console.error(`generate: cannot read handoff ${handoffPath}: ${(err as Error).message}`);
      return 1;
    }
  } else if (positionalArg) {
    // Treat as raw dataset file — scan locally, then handoff.
    let content: string;
    try {
      content = readFileSync(resolve(positionalArg), "utf8");
    } catch (err) {
      console.error(`generate: cannot read ${positionalArg}: ${(err as Error).message}`);
      return 1;
    }
    const result = scanContent(content, resolve(positionalArg));
    handoff = buildHandoff(result, { baseUrl, sourceVersion: PACKAGE_VERSION });
    console.log(
      `  Scanned ${handoff.file_basename}: ${handoff.findings_count} finding(s), overall risk ${handoff.overall_risk}.`,
    );
  } else {
    // Piped stdin? If we got a handoff JSON on stdin, use it.
    const stdinData = tryReadStdinSync();
    if (stdinData) {
      try {
        const parsed = JSON.parse(stdinData);
        if (parsed?.schema_version === "pii-scan.handoff.v1") {
          handoff = parsed as HandoffSummary;
        } else {
          console.error("generate: stdin is not a pii-scan.handoff.v1 document");
          return 1;
        }
      } catch (err) {
        console.error(`generate: stdin JSON parse failed: ${(err as Error).message}`);
        return 1;
      }
    }
  }

  if (!handoff) {
    console.error(
      "generate: provide a file, --handoff <path>, or pipe a handoff via stdin. Run with --help.",
    );
    return 2;
  }

  // Rebuild the continue_url against the caller-supplied base URL so that
  // piping a handoff generated with a different base URL still works.
  const params = new URLSearchParams({
    source: handoff.source ?? "pii-scan",
    risk: handoff.overall_risk,
    findings: String(handoff.findings_count),
    pii_cols: String(handoff.columns.length),
    rows: String(handoff.rows_scanned),
    cols: String(handoff.columns_scanned),
  });
  const continueUrl = `${baseUrl.replace(/\/$/, "")}/generate?${params.toString()}`;

  if (dryRun) {
    console.log(continueUrl);
    return 0;
  }

  openInBrowser(continueUrl);
  console.log(
    "\n  This CLI does not upload your dataset. Complete generation on the web.",
  );
  return 0;
}

function isHandoffFilename(path: string): boolean {
  return /handoff(\.[\w-]+)?\.json$/i.test(path);
}

function tryReadStdinSync(): string | null {
  try {
    // Node supports reading stdin synchronously only when redirected from a
    // file / pipe. If stdin is a TTY, return null instead of blocking.
    if (process.stdin.isTTY) return null;
    const data = readFileSync(0, "utf8");
    return data.length > 0 ? data : null;
  } catch {
    return null;
  }
}

// ── verify (offline) ─────────────────────────────────────────────────────────

async function runVerify(argv: Argv): Promise<number> {
  if (hasFlag(argv, "--help", "-h")) {
    console.log(
      `
certifieddata verify <artifact> [options]

Verify a certificate offline. Supported artifact kinds:
  <path>.json                  signed manifest envelope
  <path>.zip                   zipped certificate bundle
  <path>/                      unpacked certificate bundle directory

Options:
  --public-key <pem-path>      Override the public key PEM file
  --expected-key-id <id>       Assert the signature key_id matches
  --json                       Output the VerifyResult as JSON

This command does not contact CertifiedData.io. For online revocation and
signing-key discovery, use the @certifieddata/sdk package.
`.trim(),
    );
    return 0;
  }

  const valueFlags = new Set(["--public-key", "--expected-key-id"]);
  const artifact = positional(argv, valueFlags);
  if (!artifact) {
    console.error("verify: missing <artifact> argument. Run with --help.");
    return 2;
  }

  const publicKey = flagValue(argv, "--public-key");
  const expectedKeyId = flagValue(argv, "--expected-key-id");
  const jsonOutput = hasFlag(argv, "--json");

  let result: VerifyResult;
  const absPath = resolve(artifact);

  if (artifact.endsWith(".zip")) {
    result = await verifyBundleZip(absPath, { expectedKeyId });
  } else if (artifact.endsWith(".json")) {
    result = await verifyManifestFile(absPath, {
      publicKeyPemPath: publicKey ? resolve(publicKey) : undefined,
      expectedKeyId,
    });
  } else {
    result = await verifyBundleDirectory(absPath, { expectedKeyId });
  }

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    if (result.verified) {
      console.log(`verified: true  alg=${result.alg}  key_id=${result.key_id}`);
    } else {
      console.log(`verified: false  reason=${result.reason}`);
    }
  }
  return result.verified ? 0 : 1;
}

// ── registry (public API only) ───────────────────────────────────────────────

async function runRegistry(argv: Argv): Promise<number> {
  if (hasFlag(argv, "--help", "-h")) {
    console.log(
      `
certifieddata registry [options]

Browse public registry entries published on CertifiedData.io.

Options:
  --type <t>          Filter by artifact type (e.g. synthetic_dataset)
  --page <n>          Page number (1-based, default 1)
  --per-page <n>      Results per page (default 20, max 100)
  --base-url <url>    Override the API base URL
  --json              Output the full response as JSON
`.trim(),
    );
    return 0;
  }

  const type = flagValue(argv, "--type");
  const page = flagValue(argv, "--page");
  const perPage = flagValue(argv, "--per-page");
  const baseUrl = flagValue(argv, "--base-url");
  const jsonOutput = hasFlag(argv, "--json");

  const client = new CertifiedDataClient(baseUrl);
  try {
    const resp = await client.getRegistryEntries({
      type,
      page: page ? Number(page) : undefined,
      perPage: perPage ? Number(perPage) : undefined,
    });
    if (jsonOutput) {
      process.stdout.write(JSON.stringify(resp, null, 2) + "\n");
    } else {
      const entries = (resp as unknown as { entries?: unknown[] }).entries ?? [];
      console.log(`Registry entries: ${entries.length}`);
      for (const entry of entries) {
        console.log(`  ${JSON.stringify(entry)}`);
      }
    }
    return 0;
  } catch (err) {
    console.error(`registry: ${(err as Error).message}`);
    return 1;
  }
}

// ── openInBrowser (shared with pii-scan subcommand) ──────────────────────────

function openInBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.unref();
    console.log(`  Opened: ${url}`);
  } catch {
    console.log(`  Visit: ${url}`);
  }
}

// ── main dispatcher ──────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const [, , rawCmd, ...rest] = process.argv;
  const cmd = rawCmd?.toLowerCase();

  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    printTopLevelHelp();
    return 0;
  }
  if (cmd === "version" || cmd === "--version" || cmd === "-v") {
    console.log(PACKAGE_VERSION);
    return 0;
  }

  switch (cmd) {
    case "pii-scan":
      return runPiiScan(rest);
    case "generate":
      return runGenerate(rest);
    case "verify":
      return runVerify(rest);
    case "registry":
      return runRegistry(rest);
    default:
      console.error(`Unknown command: ${rawCmd}`);
      printTopLevelHelp();
      return 2;
  }
}

main().then(
  (code) => process.exit(code ?? 0),
  (err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);
