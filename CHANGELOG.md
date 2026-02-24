# Changelog

All notable changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [Unreleased]

---

## [0.1.0] — 2026-02-23

### Added

- `@certifieddata/verify` — Ed25519 signature verification + payload canonicalization
  - `verifyManifest(envelope, publicKeyPem, expectedKeyId?)` — full verification flow
  - `canonicalPayloadBytes(payload)` — standalone canonicalization (json-stable-stringify + strip undefined)
  - TypeScript types: `SdaasManifestEnvelope`, `SdaasCertPayload`, `SdaasSignature`, `VerifyResult`

- `@certifieddata/sdk` — CertifiedData.io client SDK
  - `SdaasClient.fetchManifest(certId)` — fetch signed envelope from API
  - `SdaasClient.fetchVerifyStatus(certId)` — fetch server-side verification status
  - `SdaasClient.fetchSigningKeys()` — fetch active public keys from `/.well-known/signing-keys.json`
  - `SdaasClient.fetchAndVerify(certId)` — full fetch + local cryptographic verification in one call

- `@certifieddata/schema-gen` — Dataset manifest scaffolding CLI + library
  - `generateManifestScaffold(input)` — generate manifest scaffold from field map
  - `sdaas-schema-gen` CLI with `--name`, `--fields`, `--rows`, `--out` flags

- `examples/fixtures/` — test keypair + 5 fixture manifests (valid, tampered, bad sig, missing fields, wrong alg)
- `examples/node-verify/` — local fixture verification example
- `examples/node-fetch-and-verify/` — live API fetch + verify example
- `examples/ci-verify/` — GitHub Actions workflow example for compliance pipelines
- `examples/python-verify/` — Python verifier for data engineering environments
- `openapi/openapi.yaml` — OpenAPI 3.0 spec for public verification endpoints
