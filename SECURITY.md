# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this SDK, **please do not open a public GitHub issue.**

Email: **security@certifieddata.io**

We will respond within 48 hours and work with you to confirm, fix, and coordinate disclosure.

## Scope

This policy covers:
- `@certifieddata/verify` — signature verification and canonicalization logic
- `@certifieddata/sdk` — API client and manifest fetching
- `@certifieddata/schema-gen` — manifest scaffolding

**Out of scope:**
- The CertifiedData.io web platform — report to security@certifieddata.io
- Certificate issuance and signing infrastructure — report to security@certifieddata.io
- Third-party dependencies — report to respective maintainers

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Security Best Practices

When using this SDK:

- Always fetch public keys from `https://certifieddata.io/.well-known/signing-keys.json` over TLS
- Pin expected `key_id` values in production environments — pass `expectedKeyId` to `verifyManifest()`
- Treat `{ verified: false }` results as hard failures in compliance pipelines
- Do not cache manifests longer than your compliance window requires (certs can be revoked)
- Check `/verify/:id/status` in addition to local verification if revocation matters for your use case

## What This SDK Does Not Do

This SDK **verifies** certificates — it does not issue or sign them. Private signing keys
are held exclusively by CertifiedData.io infrastructure and are not present in this repository.
