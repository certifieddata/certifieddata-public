/**
 * Tests for SARIF output. Enforces that SARIF logs are structurally valid and
 * do not contain raw row values from the scanned file.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSarif, scanContent } from "./index.js";

describe("buildSarif", () => {
  it("produces a SARIF 2.1.0 envelope with one run", () => {
    const csv = "email\nalice@example.com\nbob@example.com";
    const result = scanContent(csv, "/tmp/users.csv");
    const sarif = buildSarif(result, { toolVersion: "0.1.0" });
    assert.equal(sarif.version, "2.1.0");
    assert.ok(sarif.$schema.includes("sarif"), "missing SARIF schema URI");
    assert.equal(sarif.runs.length, 1);
    const run = sarif.runs[0] as Record<string, unknown>;
    const tool = run.tool as { driver: { name: string; version: string } };
    assert.equal(tool.driver.name, "@certifieddata/pii-scan");
    assert.equal(tool.driver.version, "0.1.0");
  });

  it("maps HIGH risk to error level", () => {
    const csv = "email\nalice@example.com";
    const result = scanContent(csv, "/tmp/users.csv");
    const sarif = buildSarif(result);
    const run = sarif.runs[0] as Record<string, unknown>;
    const results = run.results as Array<{ level: string }>;
    assert.ok(results.some((r) => r.level === "error"), "expected error-level result");
  });

  it("does not include raw row values in the SARIF log", () => {
    const csv = "email\nalice@example.com\nbob@example.com";
    const result = scanContent(csv, "/tmp/users.csv");
    const sarif = buildSarif(result);
    const serialized = JSON.stringify(sarif);
    assert.ok(!serialized.includes("alice@example.com"), "raw value leaked into SARIF");
    assert.ok(!serialized.includes("bob@example.com"), "raw value leaked into SARIF");
  });

  it("includes stable rule IDs", () => {
    const csv = "email\nalice@example.com";
    const result = scanContent(csv, "/tmp/users.csv");
    const sarif = buildSarif(result);
    const run = sarif.runs[0] as Record<string, unknown>;
    const tool = run.tool as { driver: { rules: Array<{ id: string }> } };
    assert.ok(tool.driver.rules.length > 0, "expected at least one rule");
    for (const rule of tool.driver.rules) {
      assert.ok(rule.id.startsWith("pii."), `rule id "${rule.id}" missing pii. prefix`);
    }
  });
});
