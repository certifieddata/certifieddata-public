# Test Fixtures

These fixtures use a **test-only Ed25519 keypair** (`keypair.test.json`).
This keypair is NOT used in production. It exists solely to let you run
verification examples locally without hitting the CertifiedData API.

## Files

| File | Description |
|------|-------------|
| `keypair.test.json` | Test keypair (public + private). Safe to commit — test use only. |
| `manifest.valid.json` | Valid envelope. `verifyManifest()` should return `{ verified: true }`. |
| `manifest.tampered.json` | `genesis.row_count` changed after signing. Should return `{ verified: false }`. |
| `manifest.bad_signature.json` | Random 64-byte signature. Should return `{ verified: false }`. |
| `manifest.missing_fields.json` | No `signature` field. Shape validation should fail immediately. |
| `manifest.wrong_alg.json` | `alg: "HMAC-SHA256"` — not independently verifiable. Returns alg error. |

## Manifest envelope format

```json
{
  "schema_version": "sdaas.manifest.v1",
  "payload": { /* the cert.v1 payload — exactly what was signed */ },
  "signature": {
    "alg": "Ed25519",
    "key_id": "test-key-fixture-1",
    "value": "<base64 signature>"
  }
}
```

## Signing rule

```
signing_input = canonicalize(payload)
             = json-stable-stringify(stripUndefined(payload))   // UTF-8 bytes

signature = Ed25519.sign(signing_input, private_key)
```

Where `stripUndefined` removes any key whose value is `undefined` (recursively),
and `json-stable-stringify` sorts object keys alphabetically at every level.

For live certificates, fetch the public key from:
```
https://certifieddata.io/.well-known/signing-keys.json
```
