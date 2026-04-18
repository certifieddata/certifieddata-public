# certifieddata-public

Developer toolkit for [CertifiedData.io](https://certifieddata.io) — a
three-step workflow to move from raw data to certified synthetic data to
independent verification.

```bash
# 1. Detect PII locally (no network)
npx @certifieddata/cli pii-scan ./customers.csv --emit-handoff --output-handoff handoff.json

# 2. Hand off to the certified-synthetic workflow
#    (opens a browser — no file contents are uploaded by this CLI)
npx @certifieddata/cli generate --handoff handoff.json

# 3. Verify the resulting certificate bundle, fully offline
npx @certifieddata/cli verify ./certificate-bundle.zip
```

Independent Ed25519 verification — no API key required, no server trust required.

---

## Packages

| Package | Install | Description |
|---------|---------|-------------|
| [`@certifieddata/cli`](packages/cli/) | `npm i -g @certifieddata/cli` | Unified CLI — `pii-scan`, `generate` (handoff), `verify` |
| [`@certifieddata/verify`](packages/verify/) | `npm i @certifieddata/verify` | Ed25519 signature verification + payload canonicalization + offline bundle verification |
| [`@certifieddata/sdk`](packages/sdk/) | `npm i @certifieddata/sdk` | Fetch + verify in one call |
| [`@certifieddata/schema-gen`](packages/schema-gen/) | `npm i @certifieddata/schema-gen` | Dataset manifest scaffolding CLI |
| [`@certifieddata/pii-scan`](packages/pii-scan/) | `npx @certifieddata/pii-scan <file>` | Scan CSV/JSON for PII patterns before synthetic generation. Local-only — no network calls. Now supports SARIF 2.1.0 output and sanitized handoff artifacts. |

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
| `GET /api/cert/:id/manifest` | Signed manifest envelope (`application/certifieddata.manifest+json`) |
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

## Workflow

These packages cover three points in the synthetic data lifecycle:

1. **Scan for PII** — `@certifieddata/pii-scan` flags likely personal data
   and can emit a sanitized handoff summary or SARIF findings for CI.
2. **Generate certified synthetic data** — `@certifieddata/cli generate`
   opens the hosted generation workflow in a browser with a sanitized
   handoff. **No file contents leave your machine through this CLI.** To
   complete generation, sign in on the web or use the documented public
   API directly with your API key.
3. **Verify the certificate** — `@certifieddata/verify` /
   `@certifieddata/sdk` / `@certifieddata/cli verify` confirm the artifact
   independently, including offline verification of an unpacked or zipped
   bundle.

Each step is independent. You do not need a CertifiedData account to verify a certificate.
Verification works offline once you have the manifest envelope and public key.

See [`docs/pricing.md`](docs/pricing.md) for the local vs. hosted boundary
and [`docs/compliance.md`](docs/compliance.md) for a compliance crosswalk.

---

## Security

Report vulnerabilities to **security@certifieddata.io** — see [SECURITY.md](SECURITY.md).

---

## License

MIT — see [LICENSE](LICENSE).
