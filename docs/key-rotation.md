# Key Rotation

CertifiedData.io uses Ed25519 asymmetric signing for certificate signatures. Public keys are published at `/.well-known/signing-keys.json`. This document covers how key rotation works and how verifiers should handle it.

---

## Current Key

| Field | Value |
|-------|-------|
| Key ID | `ed25519-prod-2025-02` |
| Algorithm | Ed25519 |
| Status | active |
| Published | `/.well-known/signing-keys.json` |

---

## How Rotation Works

When a new signing key is introduced:

1. The new key is added to `/.well-known/signing-keys.json` with `"status": "active"`.
2. All new certificates are signed with the new key. The `signing_key_id` field in the payload identifies which key was used.
3. The old key remains in `/.well-known/signing-keys.json` with `"status": "retired"` for at least **24 months** — long enough to verify any previously issued certificate.
4. Retired keys are never deleted from the endpoint. They are kept permanently for historical verification.

---

## Verifier Behavior

**When verifying a certificate:**

1. Read `payload.signing_key_id` from the certificate.
2. Fetch `/.well-known/signing-keys.json`.
3. Find the key whose `key_id` matches `payload.signing_key_id`.
4. Verify the signature using that key — regardless of whether its status is `"active"` or `"retired"`.

A certificate signed with a retired key is still valid, provided the signature verification passes. Retirement means the key is no longer used for new certificates, not that old certificates are invalidated.

---

## Caching the Public Key

Public keys change rarely. You may cache `/.well-known/signing-keys.json` for up to 1 hour (`Cache-Control: public, max-age=3600`).

For long-running processes, re-fetch the endpoint if you encounter a `key_id` that is not present in your cached copy. This handles the case where a new key was added after your last fetch.

---

## Key Pinning

For high-assurance environments, you may pin the public key:

1. Download the `public_key.pem` from the certificate zip package at issuance time.
2. Store it alongside the certificate.
3. Use the pinned key for verification instead of fetching from the well-known endpoint.

This is the most robust approach — it removes the network dependency and works even if the endpoint is unreachable.

The `@certifieddata/verify` package supports pinned key verification:

```typescript
import { verifyManifest } from "@certifieddata/verify";
import { readFileSync } from "fs";

const publicKeyPem = readFileSync("public_key.pem", "utf8");
const envelope = JSON.parse(readFileSync("certificate.json", "utf8"));

const result = await verifyManifest(envelope, publicKeyPem);
console.log(result.valid);  // true
```

---

## HMAC-SHA256 (Legacy)

Certificates issued before Ed25519 production deployment use `"signature_alg": "HMAC-SHA256"`. These certificates:

- Are identified by `signing_key_id` being absent or `null`
- Cannot be independently verified without the shared secret (which is not published)
- Are still listed as `ISSUED` in the system but are not independently verifiable

Going forward, all certificates are signed with Ed25519.

---

## Notification

Key rotation events will be announced in the [CHANGELOG](../CHANGELOG.md).

---

## See Also

- [Manifest Format](./manifest-format.md)
- [Canonicalization](./canonicalization.md)
- [FAQ](./faq.md)
