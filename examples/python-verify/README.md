# Python Certificate Verifier

Verify CertifiedData.io certificates from Python — no Node.js or npm required.

Useful in data pipelines, Jupyter notebooks, Airflow DAGs, and compliance tooling.

## Install

```bash
pip install cryptography requests
```

## Verify from a local fixture (no network)

```bash
python verify.py ../fixtures/manifest.valid.json ../fixtures/keypair.test.json
```

Output:
```json
{
  "verified": true,
  "alg": "Ed25519",
  "key_id": "test-key-fixture-1"
}
```

Test the tampered fixture (should fail):
```bash
python verify.py ../fixtures/manifest.tampered.json ../fixtures/keypair.test.json
# exits 1, prints { "verified": false, "reason": "Signature verification failed" }
```

## Verify from the live API

```bash
CERTIFIEDDATA_CERT_ID=<your-cert-id> python verify.py
```

With key pinning:
```bash
CERTIFIEDDATA_CERT_ID=<your-cert-id> \
CERTIFIEDDATA_EXPECTED_KEY_ID=ed25519-prod-2025-02 \
python verify.py
```

## Use as a library

```python
import json
import requests
from verify import verify_manifest, fetch_from_live_api

# Fetch from live API
cert_id = "your-cert-id"
envelope, public_key_pem = fetch_from_live_api(cert_id)
result = verify_manifest(envelope, public_key_pem)

print(result)
# {"verified": True, "alg": "Ed25519", "key_id": "ed25519-prod-2025-02"}
```

Or with a local manifest file:

```python
import json
from pathlib import Path
from verify import verify_manifest

envelope = json.loads(Path("manifest.json").read_text())
public_key_pem = Path("public_key.pem").read_text()

result = verify_manifest(envelope, public_key_pem, expected_key_id="ed25519-prod-2025-02")
assert result["verified"], f"Certificate invalid: {result['reason']}"
```

## Use in a Jupyter notebook

```python
import requests
from verify import verify_manifest

cert_id = "your-cert-id"

envelope = requests.get(
    f"https://certifieddata.io/api/cert/{cert_id}/manifest",
    headers={"Accept": "application/certifieddata.manifest+json"}
).json()

keys = requests.get("https://certifieddata.io/.well-known/signing-keys.json").json()
key_id = envelope["signature"]["key_id"]
pub_key = next(k["public_key_pem"] for k in keys["keys"] if k["key_id"] == key_id)

result = verify_manifest(envelope, pub_key)
print(f"Verified: {result['verified']}")  # Verified: True
```

## Canonicalization note

The signing input is:
```python
json.dumps(strip_none(payload), sort_keys=True, separators=(",", ":"))
```

This matches the server-side `json-stable-stringify(stripUndefined(payload))`.
Both produce alphabetically sorted keys at every level with no extra whitespace.
