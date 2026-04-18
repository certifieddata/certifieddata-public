# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

### Added

- `@certifieddata/cli` — unified top-level CLI package. Subcommands:
  `pii-scan`, `generate` (web handoff only, no proprietary API surface),
  `verify` (offline manifest / directory / zip), `registry`.
- `@certifieddata/pii-scan`
  - `--emit-handoff` / `--output-handoff <path>` — sanitized handoff JSON
    carrying only aggregate counts, column names, and risk labels. Never
    includes raw samples or values.
  - `--open-generate` — open a continue-generation URL in a browser. The
    URL carries only aggregate counts.
  - `--sarif` — SARIF 2.1.0 output compatible with GitHub Code Scanning.
  - Library exports: `buildHandoff`, `handoffContinueUrl`, `buildSarif`.
- `@certifieddata/verify`
  - `verifyManifestFile(path, opts)` — offline verification of a manifest
    JSON file using a locally-supplied PEM.
  - `verifyBundleDirectory(dir, opts)` — offline verification of an
    unpacked bundle directory.
  - `verifyBundleZip(zipPath, opts)` — offline verification of a zipped
    bundle (STORE + DEFLATE). Zero new runtime dependencies — uses
    Node's built-in `zlib`.
- `docs/pricing.md` — local vs. hosted boundary and evaluation path.
- `docs/compliance.md` — compliance crosswalk (SOC 2, GDPR, HIPAA, CCPA,
  EU AI Act). Support-only framing, not a certification.

### Planned

- Python port of `@certifieddata/pii-scan` with matching findings schema.
- Go verifier example for platform/enterprise buyers.
- NDJSON and Parquet input in `@certifieddata/pii-scan`.
- International PII patterns (UK NINO, EU VAT, AU TFN, CA SIN, IN Aadhaar).
- Revocation check + key-set pinning helpers in `@certifieddata/verify`.
- Browser-compatible build of `@certifieddata/verify` (no Node.js `crypto` dependency).

---

## [0.1.0] — 2026-02-23

### Added

- `@certifieddata/verify` — Ed25519 signature verification + payload canonicalization
  - `verifyManifest(envelope, publicKeyPem, expectedKeyId?)` — full verification flow
  - `canonicalPayloadBytes(payload)` — standalone canonicalization (json-stable-stringify + strip undefined)
  - TypeScript types: `CertifiedDataManifestEnvelope`, `CertifiedDataCertPayload`, `CertifiedDataSignature`, `VerifyResult`

- `@certifieddata/sdk` — CertifiedData.io client SDK
  - `CertifiedDataClient.fetchManifest(certId)` — fetch signed envelope from API
  - `CertifiedDataClient.fetchVerifyStatus(certId)` — fetch server-side verification status
  - `CertifiedDataClient.fetchSigningKeys()` — fetch active public keys from `/.well-known/signing-keys.json`
  - `CertifiedDataClient.fetchAndVerify(certId)` — full fetch + local cryptographic verification in one call

- `@certifieddata/schema-gen` — Dataset manifest scaffolding CLI + library
  - `generateManifestScaffold(input)` — generate manifest scaffold from field map
  - `schema-gen` CLI with `--name`, `--fields`, `--rows`, `--out` flags

- `examples/fixtures/` — test keypair + 5 fixture manifests (valid, tampered, bad sig, missing fields, wrong alg)
- `examples/node-verify/` — local fixture verification example
- `examples/node-fetch-and-verify/` — live API fetch + verify example
- `examples/ci-verify/` — GitHub Actions workflow example for compliance pipelines
- `examples/python-verify/` — Python verifier for data engineering environments
- `openapi/openapi.yaml` — OpenAPI 3.0 spec for public verification endpoints
