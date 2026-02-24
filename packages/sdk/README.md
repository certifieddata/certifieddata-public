# @certifieddata/sdk

CertifiedData.io client SDK. Fetch manifests, verify certificates, and check signing keys.

Wraps `@certifieddata/verify` with fetch helpers and key resolution.

## Install

```bash
npm install @certifieddata/sdk
# or
pnpm add @certifieddata/sdk
```

## Quick start

```ts
import { SdaasClient } from "@certifieddata/sdk";

const client = new SdaasClient("https://certifieddata.io");

// Fetch + independently verify in one call
const { manifest, result } = await client.fetchAndVerify("<CERT_ID>");
console.log(result);
// { verified: true, alg: "Ed25519", key_id: "ed25519-prod-2025-02" }
```

## API

### `new SdaasClient(baseUrl?)`

Creates a client. `baseUrl` defaults to `"https://certifieddata.io"`.

### `client.fetchManifest(certId)`

Fetches the signed manifest envelope for a certificate.

```ts
const envelope = await client.fetchManifest("<CERT_ID>");
// envelope.payload — the cert.v1 data
// envelope.signature — { alg, key_id, value }
```

### `client.fetchVerifyStatus(certId)`

Fetches server-side verification status (revocation, signature check, etc.).

```ts
const status = await client.fetchVerifyStatus("<CERT_ID>");
// { cert_id, verified, signature_verified, alg, key_id, checked_at }
```

### `client.fetchSigningKeys()`

Fetches active public signing keys from `/.well-known/signing-keys.json`.

```ts
const { keys } = await client.fetchSigningKeys();
// keys[0].public_key_pem — use this with verifyManifest()
```

### `client.fetchAndVerify(certId)`

Fetches the manifest and signing keys, then verifies the Ed25519 signature locally.
Full client-side cryptographic verification — no trust in server response required.

```ts
const { manifest, result } = await client.fetchAndVerify("<CERT_ID>");
```

## Re-exports

`@certifieddata/sdk` re-exports `verifyManifest` and types from `@certifieddata/verify`:

```ts
import { verifyManifest, SdaasManifestEnvelope } from "@certifieddata/sdk";
```

## License

MIT
