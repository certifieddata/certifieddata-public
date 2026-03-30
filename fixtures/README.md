# Fixtures

Test fixtures for verifying the `@certifieddata/verify` package and running examples.

## Structure

```
fixtures/
  keys/
    keypair.test.json       — Test Ed25519 keypair (public key only, for verification examples)
  certificates/
    manifest.valid.json     — Valid signed manifest (passes verification)
    manifest.tampered.json  — Tampered payload (fails signature check)
  payloads/
    payload.cert.v2.json    — Example cert.v2 payload
```

## Usage

```bash
cd examples/node-verify
node index.mjs --fixture
```

## Note

These fixtures use test keys that are NOT the production CertifiedData.io signing keys.
They exist only for local development and CI testing.
Never use fixture keys for real certificate issuance.
