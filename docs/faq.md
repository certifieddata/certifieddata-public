# Frequently Asked Questions

---

## General

### What does CertifiedData.io certify?

CertifiedData.io certifies that a synthetic dataset was generated on the CertifiedData.io platform and that no real personal data was used in its generation. The certificate is a cryptographically signed attestation of:

- The dataset name, row count, column count, and format
- The generation method (e.g. CTGAN)
- The platform that generated it (CertifiedData.io)
- The timestamp of issuance

The certificate does **not** certify statistical accuracy, fitness for a specific use case, or regulatory compliance.

---

### Is a certificate a compliance document?

No. A CertifiedData.io certificate is a technical attestation, not a legal or regulatory compliance document. It does not:

- Certify compliance with GDPR, HIPAA, CCPA, or any other regulation
- Replace a data processing agreement (DPA)
- Guarantee the synthetic data cannot be re-identified
- Constitute legal advice

Consult your legal and compliance team for regulatory decisions.

---

### What does "independently verifiable" mean?

It means any third party can verify the certificate's authenticity without contacting CertifiedData.io:

1. Fetch the certificate manifest from `certifieddata.io/api/cert/{id}/manifest`
2. Fetch the public key from `certifieddata.io/.well-known/signing-keys.json`
3. Verify the Ed25519 signature locally

The `@certifieddata/verify` package and the Python verifier in this repository implement this flow. If the signature is valid, the certificate was genuinely issued by CertifiedData.io and has not been tampered with.

---

### What happens if CertifiedData.io goes away?

If you have the certificate zip package (which includes `certificate.json` and `public_key.pem`), you can still verify the certificate using the pinned public key — no network calls required.

This is why we recommend downloading and archiving the certificate zip at issuance time.

---

## Technical

### Why Ed25519 and not RSA or ECDSA?

Ed25519 offers:
- Smaller key sizes (32 bytes public key vs. 256+ bytes for RSA-2048)
- Faster signing and verification
- Simpler implementation (no parameter choices like padding mode, curve, etc.)
- Strong security properties (resistant to fault attacks, safe curves)

Ed25519 is supported natively in Node.js 12+, Python 3.6+ (`cryptography` library), Go, Rust, and most other languages.

---

### How is the signature computed?

```
1. canonical_bytes = UTF8(json_stable_stringify(strip_null(payload)))
2. signature = Ed25519_sign(private_key, canonical_bytes)
3. signature_b64url = base64url(signature)
```

See [canonicalization.md](./canonicalization.md) for full details.

---

### What is `payload_sha256` for?

`payload.hashes.payload_sha256` is the SHA-256 of the canonical bytes of the payload (excluding that field itself). It provides a quick integrity check — if this hash matches, the payload bytes are intact. However, the definitive verification is always the Ed25519 signature.

---

### Can I verify without the `@certifieddata/verify` package?

Yes. The verification algorithm is simple:

```python
# Python example (using cryptography library)
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import load_pem_public_key
import base64, json

def verify(envelope: dict, public_key_pem: str) -> bool:
    payload = envelope["payload"]
    sig_b64 = envelope["signature"]["value"]
    # Canonicalize
    canonical = json.dumps(strip_none(payload), sort_keys=True, separators=(',', ':')).encode('utf-8')
    # Verify
    pub_key = load_pem_public_key(public_key_pem.encode())
    sig_bytes = base64.urlsafe_b64decode(sig_b64 + "==")
    try:
        pub_key.verify(sig_bytes, canonical)
        return True
    except Exception:
        return False
```

---

### What is the `key_id` format?

Key IDs follow the pattern `{algorithm}-{environment}-{YYYY-MM}`, e.g. `ed25519-prod-2025-02`. This is a human-readable identifier, not a cryptographic fingerprint. The authoritative record is the key's public key bytes.

---

### What is the certificate zip package?

When you export a certificate, you receive a zip file containing:

| File | Description |
|------|-------------|
| `certificate.json` | The signed manifest envelope |
| `certificate.pdf` | Human-readable PDF attestation |
| `public_key.pem` | The public key that signed the certificate |
| `verify.mjs` | Standalone Node.js verifier (zero external dependencies) |

This package is self-contained for long-term archival and offline verification.

---

## PII Scanner

### Is `@certifieddata/pii-scan` a compliance tool?

No. It is a diagnostic aid that uses regex heuristics to flag likely PII patterns for human review. It does not:

- Guarantee detection of all PII types
- Provide regulatory compliance
- Replace a proper data classification system or legal review

False positives and negatives are expected and possible.

---

### Does `@certifieddata/pii-scan` send data to CertifiedData.io?

No. The scanner runs entirely locally. No data leaves your machine. No network calls are made. No telemetry is collected.

---

### What formats does `@certifieddata/pii-scan` support?

CSV (with a header row) and JSON (array of objects, or `{ data: [...] }` / `{ rows: [...] }` wrappers). Binary formats (Excel, Parquet, Avro, etc.) are not supported.

---

## See Also

- [Manifest Format](./manifest-format.md)
- [Canonicalization](./canonicalization.md)
- [Key Rotation](./key-rotation.md)
- [CertifiedData.io Security FAQ](https://certifieddata.io/security-and-certification-faq)
- [Verification Framework](https://certifieddata.io/verification-framework)
