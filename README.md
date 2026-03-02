# certifieddata-public

Verification and integration toolkit for [CertifiedData.io](https://certifieddata.io) synthetic dataset certificates.

Independent Ed25519 verification — no API key required, no server trust required.

---

## Packages

| Package | Install | Description |
|---------|---------|-------------|
| [`@certifieddata/verify`](packages/verify/) | `npm i @certifieddata/verify` | Ed25519 signature verification + payload canonicalization |
| [`@certifieddata/sdk`](packages/sdk/) | `npm i @certifieddata/sdk` | Fetch + verify in one call |
| [`@certifieddata/schema-gen`](packages/schema-gen/) | `npm i @certifieddata/schema-gen` | Dataset manifest scaffolding CLI |

---

## Verify a certificate

```ts
import { CertifiedDataClient } from "@certifieddata/sdk";

const { result } = await new CertifiedDataClient().fetchAndVerify("CERT_ID");
console.log(result);
// { verified: true, alg: "Ed25519", key_id: "ed25519-prod-2025-02" }
```

Or with just `@certifieddata/verify` and your own fetch:

```ts
import { verifyManifest } from "@certifieddata/verify";

const envelope = await fetch("https://certifieddata.io/api/cert/CERT_ID/manifest", {
  headers: { Accept: "application/certifieddata.manifest+json" },
}).then(r => r.json());

const { keys } = await fetch("https://certifieddata.io/.well-known/signing-keys.json").then(r => r.json());
const key = keys.find(k => k.key_id === envelope.signature.key_id);

const result = await verifyManifest(envelope, key.public_key_pem);
```

---

## Python

```bash
pip install cryptography requests
CERTIFIEDDATA_CERT_ID=<cert-id> python examples/python-verify/verify.py
```

See [`examples/python-verify/`](examples/python-verify/) for library usage and Jupyter notebook examples.

---

## CI/CD

Add certificate verification to a GitHub Actions pipeline before using a synthetic dataset:

```yaml
- name: Verify CertifiedData Certificate
  env:
    CERTIFIEDDATA_CERT_ID: ${{ secrets.CERTIFIEDDATA_CERT_ID }}
  run: |
    curl -fsSL https://raw.githubusercontent.com/certifieddata/certifieddata-public/main/examples/ci-verify/verify.mjs -o verify.mjs
    node verify.mjs
```

Full workflow template: [`examples/ci-verify/verify-synthetic-data.yml`](examples/ci-verify/verify-synthetic-data.yml)

---

## How it works

Certificates are signed with an Ed25519 private key held by CertifiedData.io infrastructure.
The public key is published at `https://certifieddata.io/.well-known/signing-keys.json`.

**Signing input:** `json-stable-stringify(stripUndefined(payload))` → UTF-8 bytes

Verification is fully offline once you have the manifest envelope and public key.

---

## API endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/cert/:id/manifest` | Signed manifest envelope (`application/sdaas.manifest+json`) |
| `GET /verify/:id/status` | Server-side verification status (JSON) |
| `GET /.well-known/signing-keys.json` | Active Ed25519 public keys |

OpenAPI spec: [`openapi/openapi.yaml`](openapi/openapi.yaml)

---

## Test fixtures

[`examples/fixtures/`](examples/fixtures/) includes a test keypair and five pre-signed manifests
(valid, tampered, bad signature, missing fields, wrong algorithm) for running examples offline.

```bash
git clone https://github.com/certifieddata/certifieddata-public.git
cd certifieddata-public && pnpm install && pnpm build
cd examples/node-verify && node index.mjs valid
```

---

## Security

Report vulnerabilities to **security@certifieddata.io** — see [SECURITY.md](SECURITY.md).

---

## License

MIT — see [LICENSE](LICENSE).
