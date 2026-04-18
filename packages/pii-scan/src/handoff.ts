/**
 * Handoff module for @certifieddata/pii-scan.
 *
 * Builds a sanitized summary artifact that bridges a local PII scan into
 * downstream synthetic-data generation workflows.
 *
 * Privacy rules enforced here:
 *   - Never includes raw sample values, redacted or otherwise.
 *   - Never includes file contents.
 *   - Column names ARE included in the handoff artifact (they describe the
 *     schema the generator must produce), but are NOT placed in deeplink
 *     query strings by default.
 *   - Deeplinks carry only aggregate counts + risk level + a local handoff
 *     token the user can upload manually.
 */
import type { ScanResult } from "./scanner.js";
import type { RiskLevel } from "./patterns.js";

export interface HandoffColumnSummary {
  column: string;
  risk: RiskLevel;
  suspected_types: string[];
  match_count: number;
  sources: ("content" | "column_name")[];
}

export interface HandoffSummary {
  schema_version: "pii-scan.handoff.v1";
  generated_at: string;
  source: "pii-scan";
  source_version: string;
  file_basename: string;
  rows_scanned: number;
  columns_scanned: number;
  findings_count: number;
  overall_risk: RiskLevel;
  columns: HandoffColumnSummary[];
  summary: string;
  /** UI deeplink a tool or shell can open to continue the workflow. */
  continue_url: string;
}

const HANDOFF_SCHEMA_VERSION = "pii-scan.handoff.v1" as const;

function basename(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

function aggregateColumns(result: ScanResult): HandoffColumnSummary[] {
  const byCol = new Map<string, HandoffColumnSummary>();
  for (const f of result.findings) {
    const existing = byCol.get(f.column);
    if (existing) {
      if (!existing.suspected_types.includes(f.patternName)) {
        existing.suspected_types.push(f.patternName);
      }
      if (!existing.sources.includes(f.source)) existing.sources.push(f.source);
      existing.match_count += f.matchCount;
      // Promote risk upward
      const order = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
      if (order[f.risk] > order[existing.risk]) existing.risk = f.risk;
    } else {
      byCol.set(f.column, {
        column: f.column,
        risk: f.risk,
        suspected_types: [f.patternName],
        match_count: f.matchCount,
        sources: [f.source],
      });
    }
  }
  return [...byCol.values()];
}

export interface BuildHandoffOptions {
  /** Base URL for the continue-generation deeplink. Default: https://certifieddata.io */
  baseUrl?: string;
  /** Package version of the scanner emitting the handoff. */
  sourceVersion?: string;
}

/**
 * Build a handoff summary from a scan result.
 *
 * This is pure — it does no file I/O and no network calls. Callers decide
 * whether to write the artifact to disk or open the deeplink.
 */
export function buildHandoff(
  result: ScanResult,
  opts: BuildHandoffOptions = {}
): HandoffSummary {
  const baseUrl = (opts.baseUrl ?? "https://certifieddata.io").replace(/\/$/, "");
  const columns = aggregateColumns(result);

  // Deeplink carries only aggregate counts — not column names or samples.
  // Users who want to pass the full schema to the web UI must upload
  // handoff.json explicitly.
  const params = new URLSearchParams({
    source: "pii-scan",
    risk: result.overallRisk,
    findings: String(result.findings.length),
    pii_cols: String(columns.length),
    rows: String(result.rowsScanned),
    cols: String(result.columnsScanned),
  });

  return {
    schema_version: HANDOFF_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    source: "pii-scan",
    source_version: opts.sourceVersion ?? "unknown",
    file_basename: basename(result.file),
    rows_scanned: result.rowsScanned,
    columns_scanned: result.columnsScanned,
    findings_count: result.findings.length,
    overall_risk: result.overallRisk,
    columns,
    summary: result.summary,
    continue_url: `${baseUrl}/generate?${params.toString()}`,
  };
}

/**
 * Return just the continue-generation deeplink for a scan result.
 * Useful when the caller wants to print or open the URL without
 * materializing the full handoff artifact.
 */
export function handoffContinueUrl(
  result: ScanResult,
  opts: BuildHandoffOptions = {}
): string {
  return buildHandoff(result, opts).continue_url;
}
