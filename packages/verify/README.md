# @certifieddata/verify

Independently verify CertifiedData.io certificate manifests using Ed25519.

No server trust required. Works offline once you have the manifest and public key.

## Install

```bash
npm install @certifieddata/verify
# or
pnpm add @certifieddata/verify
```

## Quick start

```ts
import { verifyManifest } from "@certifieddata/verify";

// 1. Fetch the manifest envelope from CertifiedData
const envelope = await fetch(
  "https://certifieddata.io/api/cert/<CERT_ID>/manifest",
  { headers: { Accept: "application/sdaas.manifest+json" } }
).then(r => r.json());

// 2. Fetch the public signing key
const { keys } = await fetch("https://certifieddata.io/.well-known/signing-keys.json")
  .then(r => r.json());
const key = keys.find(k => k.key_id === envelope.signature.key_id);

// 3. Verify locally — no further network calls needed
const result = await verifyManifest(envelope, key.public_key_pem);
console.log(result);
// { verified: true, alg: "Ed25519", key_id: "ed25519-prod-2025-02" }
```

## API

### `verifyManifest(envelope, publicKeyPem, expectedKeyId?)`

```ts
function verifyManifest(
  envelope: unknown,
  publicKeyPem: string,
  expectedKeyId?: string
): Promise<VerifyResult>
```

**Parameters:**
- `envelope` — Parsed JSON from `GET /api/cert/:id/manifest`
- `publicKeyPem` — PEM-encoded Ed25519 public key (from `/.well-known/signing-keys.json`)
- `expectedKeyId` — Optional. If provided, asserts the key_id in the manifest matches.

**Returns:**
```ts
type VerifyResult =
  | { verified: true;  alg: string; key_id: string | null }
  | { verified: false; alg?: string; key_id?: string | null; reason: string }
```

### `canonicalPayloadBytes(payload)`

```ts
function canonicalPayloadBytes(payload: unknown): Buffer
```

Returns the canonical UTF-8 byte representation of a payload — the exact
bytes that were signed. Useful for debugging or building your own verification.

Canonicalization: `json-stable-stringify(stripUndefined(payload))` → UTF-8 bytes.

## Manifest envelope format

```json
{
  "schema_version": "sdaas.manifest.v1",
  "payload": {
    "schema_version": "cert.v1",
    "certificate_id": "...",
    "certificate_type": "GENESIS",
    "issued_at": "2026-02-22T00:00:00.000Z",
    "issuer": { "name": "CertifiedData.io", "environment": "production", ... },
    "subject": { "dataset_name": "my_dataset" },
    "hashes": {
      "certificate_payload_sha256": "<hex>",
      "datasets": {
        "transactions.csv": { "sha256": "<hex>", "size_bytes": 45678, "row_count": 1000 }
      }
    }
  },
  "signature": {
    "alg": "Ed25519",
    "key_id": "ed25519-prod-2025-02",
    "value": "<base64>"
  }
}
```

## Requirements

- Node.js 18+
- The `crypto` module (built-in — no additional dependencies for verification itself)

## License

MIT
