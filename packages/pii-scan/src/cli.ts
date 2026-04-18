#!/usr/bin/env node
/**
 * pii-scan CLI
 *
 * Scans CSV or JSON dataset files for likely PII patterns.
 * Runs entirely locally. No data leaves your machine.
 *
 * Usage:
 *   npx @certifieddata/pii-scan ./dataset.csv
 *   npx @certifieddata/pii-scan ./records.json
 *   npx @certifieddata/pii-scan ./data.csv --json        # JSON output
 *   npx @certifieddata/pii-scan ./data.csv --sarif       # SARIF 2.1.0 output
 *   npx @certifieddata/pii-scan ./data.csv --emit-handoff
 *   npx @certifieddata/pii-scan ./data.csv --output-handoff handoff.json
 *   npx @certifieddata/pii-scan ./data.csv --open-generate
 *   npx @certifieddata/pii-scan ./data.csv --no-color    # plain text
 *
 * DISCLAIMER: This tool is a diagnostic aid, not a compliance control.
 * It does NOT guarantee detection of all PII. False positives and
 * negatives are possible. Do not rely on this tool as a substitute
 * for proper data governance or legal review.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { scanContent } from "./scanner.js";
import type { ColumnFinding, ScanResult } from "./scanner.js";
import type { RiskLevel } from "./patterns.js";
import { buildHandoff } from "./handoff.js";
import { buildSarif } from "./sarif.js";

const PACKAGE_VERSION = "0.1.0";

function flagValue(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1] && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  return undefined;
}

const args = process.argv.slice(2);

// Positional file argument: first non-flag arg that isn't a flag's value
function firstPositional(argv: string[]): string | undefined {
  const valueFlags = new Set(["--output-handoff", "--base-url"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) continue;
    const prev = argv[i - 1];
    if (prev && valueFlags.has(prev) && !prev.includes("=")) continue;
    return a;
  }
  return undefined;
}

const filePath = firstPositional(args);
const jsonOutput = args.includes("--json");
const sarifOutput = args.includes("--sarif");
const emitHandoff = args.includes("--emit-handoff");
const openGenerate = args.includes("--open-generate");
const outputHandoffPath = flagValue(args, "--output-handoff");
const baseUrl = flagValue(args, "--base-url") ?? "https://certifieddata.io";
const noColor = args.includes("--no-color") || !process.stdout.isTTY;

if (!filePath || args.includes("--help") || args.includes("-h")) {
  console.log(`
pii-scan — Local PII risk scanner for datasets

Usage: npx @certifieddata/pii-scan <file> [options]

Arguments:
  <file>                      CSV or JSON file to scan

Output options:
  --json                      Output results as JSON (machine-readable)
  --sarif                     Output results as SARIF 2.1.0 (GitHub Code
                              Scanning compatible)
  --no-color                  Disable color output

Handoff to generation (opt-in, local-only):
  --emit-handoff              Print a sanitized handoff summary JSON with a
                              continue-generation deeplink. Contains column
                              names, counts, and risk — no raw values.
  --output-handoff <path>     Write the handoff summary to a local file.
  --open-generate             Open the continue-generation URL in a browser.
                              The URL carries only aggregate counts — no
                              column names, no samples, no raw data.
  --base-url <url>            Override the handoff base URL
                              (default: https://certifieddata.io).

  -h, --help                  Show this help

Examples:
  npx @certifieddata/pii-scan ./customers.csv
  npx @certifieddata/pii-scan ./users.json --json
  npx @certifieddata/pii-scan ./users.csv --sarif > pii.sarif
  npx @certifieddata/pii-scan ./users.csv --emit-handoff
  npx @certifieddata/pii-scan ./users.csv --output-handoff handoff.json
  npx @certifieddata/pii-scan ./users.csv --open-generate

Supported formats: CSV, JSON (array of objects)

DISCLAIMER: Diagnostic aid only. Not a compliance control.
No data leaves your machine. No network calls are made unless you
explicitly pass --open-generate, which opens a browser to a URL
carrying only aggregate counts.
`.trim());
  process.exit(0);
}

// Color helpers
const c = {
  reset: noColor ? "" : "\x1b[0m",
  bold: noColor ? "" : "\x1b[1m",
  red: noColor ? "" : "\x1b[31m",
  yellow: noColor ? "" : "\x1b[33m",
  green: noColor ? "" : "\x1b[32m",
  cyan: noColor ? "" : "\x1b[36m",
  gray: noColor ? "" : "\x1b[90m",
  white: noColor ? "" : "\x1b[97m",
};

function riskColor(risk: RiskLevel): string {
  if (risk === "HIGH") return c.red;
  if (risk === "MEDIUM") return c.yellow;
  return c.green;
}

function riskBadge(risk: RiskLevel): string {
  return `${riskColor(risk)}${c.bold}[${risk}]${c.reset}`;
}

const absPath = resolve(filePath);
let content: string;

try {
  content = readFileSync(absPath, "utf8");
} catch (err) {
  console.error(`Error reading file: ${(err as Error).message}`);
  process.exit(1);
}

const result: ScanResult = scanContent(content, absPath);
const exitCode = result.overallRisk === "HIGH" ? 2 : result.findings.length > 0 ? 1 : 0;

// ── Handoff emission (can combine with any output mode) ─────────────────────

const handoff = emitHandoff || openGenerate || outputHandoffPath
  ? buildHandoff(result, { baseUrl, sourceVersion: PACKAGE_VERSION })
  : null;

if (outputHandoffPath && handoff) {
  try {
    writeFileSync(resolve(outputHandoffPath), JSON.stringify(handoff, null, 2) + "\n", "utf8");
  } catch (err) {
    console.error(`Error writing handoff file: ${(err as Error).message}`);
    process.exit(1);
  }
}

// ── Machine-readable output modes ────────────────────────────────────────────

if (sarifOutput) {
  const sarif = buildSarif(result, { toolVersion: PACKAGE_VERSION });
  process.stdout.write(JSON.stringify(sarif, null, 2) + "\n");
  if (handoff && openGenerate) openInBrowser(handoff.continue_url);
  process.exit(exitCode);
}

if (jsonOutput) {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (handoff && openGenerate) openInBrowser(handoff.continue_url);
  process.exit(exitCode);
}

// Human-readable output
console.log(`
${c.bold}${c.white}pii-scan${c.reset} ${c.gray}— local PII risk scanner${c.reset}
${c.gray}${"─".repeat(60)}${c.reset}
  File   : ${absPath}
  Rows   : ${result.rowsScanned.toLocaleString()}
  Columns: ${result.columnsScanned}
${c.gray}${"─".repeat(60)}${c.reset}`);

if (result.findings.length === 0) {
  console.log(`
  ${c.green}${c.bold}No PII patterns detected.${c.reset}

  ${c.gray}Review manually before use. Automated detection has limits.${c.reset}
`);
  if (handoff && emitHandoff) {
    console.log(`${c.gray}Handoff:${c.reset}`);
    process.stdout.write(JSON.stringify(handoff, null, 2) + "\n");
  }
  if (handoff && openGenerate) openInBrowser(handoff.continue_url);
  process.exit(0);
}

// Group by column
const byColumn = new Map<string, ColumnFinding[]>();
for (const f of result.findings) {
  if (!byColumn.has(f.column)) byColumn.set(f.column, []);
  byColumn.get(f.column)!.push(f);
}

// Sort columns by max risk
const sorted = [...byColumn.entries()].sort(([, a], [, b]) => {
  const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const maxA = Math.max(...a.map((f) => riskOrder[f.risk]));
  const maxB = Math.max(...b.map((f) => riskOrder[f.risk]));
  return maxB - maxA;
});

console.log(`\n  ${c.bold}Findings${c.reset}\n`);

for (const [column, findings] of sorted) {
  const colRisk = findings.reduce<RiskLevel>(
    (acc, f) => (f.risk === "HIGH" || (acc !== "HIGH" && f.risk === "MEDIUM") ? f.risk : acc),
    "LOW"
  );
  console.log(`  ${riskBadge(colRisk)} ${c.bold}${column}${c.reset}`);
  for (const f of findings) {
    const src = f.source === "column_name" ? `${c.gray}(column name)${c.reset}` : `${c.gray}(${f.matchCount} match${f.matchCount !== 1 ? "es" : ""} in content)${c.reset}`;
    const samples = f.sampleValues.length > 0 ? `  ${c.gray}e.g. ${f.sampleValues.join(", ")}${c.reset}` : "";
    console.log(`         ${f.patternName} ${src}${samples}`);
  }
  console.log();
}

const highCount = result.findings.filter((f) => f.risk === "HIGH").length;
const medCount = result.findings.filter((f) => f.risk === "MEDIUM").length;

console.log(`${c.gray}${"─".repeat(60)}${c.reset}`);
console.log(`  Overall risk : ${riskBadge(result.overallRisk)}`);
console.log(`  Findings     : ${highCount > 0 ? `${c.red}${highCount} HIGH${c.reset}  ` : ""}${medCount > 0 ? `${c.yellow}${medCount} MEDIUM${c.reset}  ` : ""}${result.findings.length} total`);
console.log();
console.log(`  ${c.yellow}${c.bold}${result.summary}${c.reset}`);
console.log();
console.log(`  ${c.gray}Next step: Generate a certified synthetic replacement at${c.reset}`);
console.log(`  ${c.cyan}${handoff ? handoff.continue_url : "https://certifieddata.io"}${c.reset}`);
console.log();
console.log(`  ${c.gray}DISCLAIMER: Diagnostic aid only. Not a compliance control.${c.reset}`);
console.log(`  ${c.gray}False positives and negatives are possible.${c.reset}`);
console.log();

if (handoff && emitHandoff) {
  console.log(`${c.gray}Handoff:${c.reset}`);
  process.stdout.write(JSON.stringify(handoff, null, 2) + "\n");
}

if (handoff && openGenerate) openInBrowser(handoff.continue_url);

process.exit(exitCode);

// ── helpers ──────────────────────────────────────────────────────────────────

function openInBrowser(url: string): void {
  // Best-effort open across platforms. Does not transmit any payload —
  // only causes the OS to launch a browser at the given URL.
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.unref();
    console.log(`${c.gray}Opened: ${url}${c.reset}`);
  } catch {
    console.log(`${c.gray}Could not launch browser. Visit:${c.reset} ${c.cyan}${url}${c.reset}`);
  }
}
