/**
 * Tests for the handoff module. Privacy-critical: these tests lock in the
 * rule that raw sample values never appear in handoff artifacts or URLs.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildHandoff, handoffContinueUrl, scanContent } from "./index.js";

function csvWithPii(): string {
  return [
    "name,email,phone",
    "Alice Smith,alice@example.com,555-123-4567",
    "Bob Jones,bob@example.com,555-987-6543",
  ].join("\n");
}

describe("buildHandoff", () => {
  it("produces a stable v1 schema envelope", () => {
    const result = scanContent(csvWithPii(), "/tmp/customers.csv");
    const h = buildHandoff(result);
    assert.equal(h.schema_version, "pii-scan.handoff.v1");
    assert.equal(h.source, "pii-scan");
    assert.equal(h.file_basename, "customers.csv");
    assert.ok(h.generated_at.includes("T"));
  });

  it("aggregates findings per column and preserves overall risk", () => {
    const result = scanContent(csvWithPii(), "/tmp/customers.csv");
    const h = buildHandoff(result);
    assert.equal(h.overall_risk, "HIGH");
    assert.ok(h.columns.length >= 1, "expected at least one flagged column");
    const emailCol = h.columns.find((c) => c.column === "email");
    assert.ok(emailCol, "expected email column in handoff");
    assert.equal(emailCol!.risk, "HIGH");
  });

  it("never includes raw sample values in the handoff artifact", () => {
    const result = scanContent(csvWithPii(), "/tmp/customers.csv");
    const h = buildHandoff(result);
    const serialized = JSON.stringify(h);
    assert.ok(!serialized.includes("alice@example.com"), "raw email leaked into handoff");
    assert.ok(!serialized.includes("555-123-4567"), "raw phone leaked into handoff");
    assert.ok(!serialized.includes("Alice Smith"), "raw name leaked into handoff");
  });

  it("builds a continue URL without column names or samples", () => {
    const result = scanContent(csvWithPii(), "/tmp/customers.csv");
    const url = handoffContinueUrl(result);
    assert.ok(url.startsWith("https://certifieddata.io/generate?"), "unexpected URL base");
    assert.ok(!url.includes("email"), "column name leaked into deeplink");
    assert.ok(!url.includes("phone"), "column name leaked into deeplink");
    assert.ok(!url.includes("alice"), "raw value leaked into deeplink");
    assert.ok(url.includes("source=pii-scan"), "missing source attribution param");
    assert.ok(url.includes("risk=HIGH"), "missing risk aggregate");
  });

  it("respects a custom base URL", () => {
    const result = scanContent(csvWithPii(), "/tmp/customers.csv");
    const url = handoffContinueUrl(result, { baseUrl: "https://staging.certifieddata.io/" });
    assert.ok(url.startsWith("https://staging.certifieddata.io/generate?"));
  });
});
