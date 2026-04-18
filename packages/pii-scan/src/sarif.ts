/**
 * SARIF 2.1.0 output for @certifieddata/pii-scan.
 *
 * Enables GitHub Code Scanning and any SARIF-aware security tool to ingest
 * pii-scan findings as structured alerts. The SARIF log does not contain
 * raw row values — only pattern metadata, column names, and aggregate counts.
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/
 */
import type { ScanResult, ColumnFinding } from "./scanner.js";
import type { RiskLevel } from "./patterns.js";

const SARIF_SCHEMA =
  "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json";
const SARIF_VERSION = "2.1.0";
const TOOL_NAME = "@certifieddata/pii-scan";
const INFORMATION_URI = "https://github.com/certifieddata/certifieddata-public";

type SarifLevel = "error" | "warning" | "note";

function riskToLevel(risk: RiskLevel): SarifLevel {
  if (risk === "HIGH") return "error";
  if (risk === "MEDIUM") return "warning";
  return "note";
}

function ruleId(finding: ColumnFinding): string {
  // Stable, kebab-cased identifiers keyed by source + pattern.
  const slug = finding.patternName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return finding.source === "column_name"
    ? `pii.column-name.${slug}`
    : `pii.content.${slug}`;
}

function uniqueRules(findings: ColumnFinding[]) {
  const seen = new Map<string, {
    id: string;
    name: string;
    shortDescription: { text: string };
    fullDescription: { text: string };
    defaultConfiguration: { level: SarifLevel };
    helpUri: string;
    help: { text: string };
  }>();

  for (const f of findings) {
    const id = ruleId(f);
    if (seen.has(id)) continue;
    seen.set(id, {
      id,
      name: f.patternName.replace(/\s+/g, ""),
      shortDescription: { text: `Possible PII pattern: ${f.patternName}` },
      fullDescription: {
        text:
          f.source === "column_name"
            ? `The column name matches a known PII label (${f.patternName}). Review whether the column contains personal data.`
            : `Content matches the ${f.patternName} pattern. Review whether the values are real personal data.`,
      },
      defaultConfiguration: { level: riskToLevel(f.risk) },
      helpUri: "https://certifieddata.io",
      help: {
        text:
          "Replace flagged columns with certified synthetic equivalents before using in lower environments. " +
          "See https://certifieddata.io for certified synthetic data generation.",
      },
    });
  }
  return [...seen.values()];
}

export interface SarifLog {
  $schema: string;
  version: string;
  runs: Array<Record<string, unknown>>;
}

export interface BuildSarifOptions {
  /** Package version of the scanner emitting this log. */
  toolVersion?: string;
  /** Root URI to resolve relative artifact locations against. */
  sourceRoot?: string;
}

export function buildSarif(result: ScanResult, opts: BuildSarifOptions = {}): SarifLog {
  const rules = uniqueRules(result.findings);

  const results = result.findings.map((f) => {
    const level = riskToLevel(f.risk);
    const message =
      f.source === "column_name"
        ? `Column "${f.column}" name matches PII label: ${f.patternName} (${f.risk} risk).`
        : `Column "${f.column}" contains ${f.matchCount} value(s) matching ${f.patternName} (${f.risk} risk).`;
    return {
      ruleId: ruleId(f),
      level,
      message: { text: message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: result.file },
            region: { startLine: 1 },
          },
          logicalLocations: [
            {
              name: f.column,
              kind: "object",
            },
          ],
        },
      ],
      properties: {
        column: f.column,
        risk: f.risk,
        source: f.source,
        matchCount: f.matchCount,
      },
    };
  });

  return {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            informationUri: INFORMATION_URI,
            version: opts.toolVersion ?? "unknown",
            rules,
          },
        },
        invocations: [
          {
            executionSuccessful: true,
            endTimeUtc: new Date().toISOString(),
          },
        ],
        results,
        ...(opts.sourceRoot
          ? { originalUriBaseIds: { SRCROOT: { uri: opts.sourceRoot } } }
          : {}),
      },
    ],
  };
}
