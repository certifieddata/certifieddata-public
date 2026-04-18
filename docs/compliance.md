# Compliance crosswalk

This document describes how the OSS tooling in this repository **supports**
common compliance workflows. It does not claim compliance on behalf of
CertifiedData.io or its users. A CertifiedData.io certificate is a
technical attestation, not a regulatory compliance document — see
[FAQ](./faq.md#is-a-certificate-a-compliance-document).

> **Do not treat this page as legal advice.** Consult your legal,
> security, and compliance teams before relying on any of these
> mappings. Mappings are control-support, not certification.

---

## What this tooling provides

| Capability | Package |
|---|---|
| Local-only PII pattern detection | `@certifieddata/pii-scan` |
| Sanitized handoff summaries (no raw data) | `@certifieddata/pii-scan` |
| Offline Ed25519 signature verification | `@certifieddata/verify` |
| Offline bundle verification (dir + zip) | `@certifieddata/verify` |
| SARIF 2.1.0 findings for GitHub Code Scanning | `@certifieddata/pii-scan` |
| CI-native verification flow | `examples/ci-verify/` |

None of these require transmitting datasets off the machine running the
tool. Network calls happen only in the hosted paths (generation, registry
read, signing key fetch).

---

## SOC 2 (Trust Services Criteria)

These are workflow-support mappings, not a controls audit.

| TSC area | How this tooling supports it |
|---|---|
| CC6.1 — Logical access | Verifiers run with a locally-supplied public key; no credentials are needed to verify an artifact. |
| CC6.7 — Transmission of data | `pii-scan` and `verify` make no network calls. Handoffs transmit only aggregate counts via explicit URL params. |
| CC7.2 — System monitoring | SARIF output lets findings land in GitHub Code Scanning or any SARIF-aware monitor. |
| CC8.1 — Change management | Certificate manifests are signed; `verify` detects tampering independently. |

---

## GDPR

| Concern | How this tooling supports it |
|---|---|
| Article 5(1)(f) integrity | Ed25519 signature verification on the manifest lets you detect tampering post-issuance. |
| Article 25 data protection by design | `pii-scan` surfaces likely personal data columns before they reach lower environments; handoff summaries avoid transmitting raw data. |
| Article 32 security of processing | Offline verification, SARIF outputs, and reproducible canonicalization allow independent review of signed attestations. |

`pii-scan` is a **diagnostic aid** for pattern-based discovery of likely
personal data. It does not detect:

- names embedded in free text,
- non-US national identifiers (UK NINO, EU VAT, AU TFN, CA SIN, IN Aadhaar, …),
- de-anonymization risk from quasi-identifiers,
- encoded / encrypted PII.

See [`packages/pii-scan/README.md`](../packages/pii-scan/README.md#limitations-and-false-positives)
for the full limits list.

---

## HIPAA

`pii-scan` can flag obvious patterns that map to HIPAA "identifiers" under
§164.514(b)(2):

- email addresses
- telephone numbers
- SSN
- account / health-plan / medical-record-number-like sequences
- dates of birth
- ZIP codes

It does **not** implement the Safe Harbor or Expert Determination methods
of de-identification — those require statistical and contextual analysis
beyond regex heuristics. Treat `pii-scan` output as a pre-review checklist,
not a de-identification audit.

---

## CCPA / CPRA

The package helps identify candidate columns likely to be "personal
information" under §1798.140(v), but does not substitute for a mapping
exercise across your data systems.

---

## EU AI Act adjacent concerns

| Concern | How this tooling supports it |
|---|---|
| Data governance for training datasets (Art. 10) | CertifiedData.io certificates attest that a synthetic dataset was generated on the platform — independent verification is possible via `@certifieddata/verify`. |
| Transparency (Art. 13) | Badges and machine-readable certificate metadata (`llms.txt`, OpenAPI) let downstream systems discover provenance without ad-hoc scraping. |
| Record-keeping (Art. 12) | Bundle archival + offline verification means the artifact remains auditable even if the issuer is unreachable. |

This tooling does not classify AI systems, does not assess risk tiers,
and does not issue conformity assessments.

---

## Airgapped and long-term archival posture

For regulated environments that require offline archival:

1. Download the certificate bundle zip at issuance.
2. Verify it immediately using `@certifieddata/cli verify bundle.zip`.
3. Store the zip alongside your artifact. It contains the manifest and
   the public key that signed it.
4. At audit time, verify again — no network access required.

This workflow is the basis of the "the artifact remains independently
verifiable even if the issuer goes away" design claim. See the
[verification spec](../spec/verification-spec.md) for the cryptographic
details.

---

## What this page is not

- Not a compliance certification of CertifiedData.io.
- Not legal advice.
- Not a substitute for a data classification or privacy-impact assessment.
- Not a statement that using these tools puts you in compliance.

For authoritative statements about CertifiedData.io's own hosted-service
compliance posture, contact the CertifiedData.io team.
