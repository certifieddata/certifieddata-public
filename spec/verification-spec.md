# Verification Specification

Independent verification of a CertifiedData.io certificate. No trust in the server response is required once you have the signed manifest and public key.

## Steps

### 1. Fetch the signed manifest

```
GET /api/cert/:id/manifest
Accept: application/certifieddata.manifest+json
```

The response contains:
- `payload` — exactly what was signed
- `signature.alg` — algorithm (only `Ed25519` is independently verifiable)
- `signature.key_id` — which public key to use
- `signature.value` — base64-encoded signature bytes

### 2. Fetch the signing public key

```
GET /.well-known/signing-keys.json
```

Find the key with `key_id` matching `signature.key_id`. Reject if:
- Key is not found
- Key `status` is `"revoked"` (not `"active"`)

### 3. Canonicalize the payload

Apply:
```
json-stable-stringify(stripUndefined(payload)) → UTF-8 bytes
```

This produces the exact byte sequence that was signed.

### 4. Verify the Ed25519 signature

Using the public key PEM (SPKI format, `BEGIN PUBLIC KEY`) and the canonical payload bytes:

```ts
import { verifyManifest } from "@certifieddata/verify";

const result = await verifyManifest(envelope, publicKeyPem);
// { verified: true, alg: "Ed25519", key_id: "..." }
```

### 5. Optionally: verify the dataset hash

If you have the original dataset file, recompute its SHA-256 and compare against `payload.dataset_hash`:

```
sha256:<hex> == payload.dataset_hash
```

A matching hash proves the exact file was the one certified.

## Supported algorithms

| Algorithm | Verifiable | Notes |
|---|---|---|
| `Ed25519` | Yes | All certs issued from 2024 onward |
| `HMAC-SHA256` | No | Legacy only — cannot be independently verified without the private key |

## Expected failure modes

| Failure | Cause |
|---|---|
| `Signature verification failed` | Payload was tampered with, or wrong public key |
| `key_id mismatch` | Expected key ID doesn't match the envelope |
| `signature.value is null` | Certificate was issued without a detached signature (legacy) |
| `No public key found` | Key was rotated or revoked and removed from the JWKS document |
| `envelope missing required fields` | Malformed envelope (shape validation failed) |

## Trust model

What you trust:
- The Ed25519 public key at `/.well-known/signing-keys.json`
- The cryptographic validity of Ed25519

What you do **not** need to trust:
- The server's claim that a certificate is valid
- Any `/verify` API response
- Any badge widget output

The cryptographic proof is in the manifest + public key. Everything else is convenience.
