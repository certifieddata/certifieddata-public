# Certificate Payload Schema

CertifiedData.io certificates are structured records, not PDFs. The certificate payload is a JSON object that is canonicalized and signed with Ed25519.

## Active schema version

```
cert.v2
```

## Deprecated versions

| Version | Status | Notes |
|---|---|---|
| `cert.v1` | Deprecated | Still valid for verification; no longer issued |
| `cert.v2` | Active | Current issuance version |

## Payload fields

| Field | Type | Required | Description |
|---|---|---|---|
| `certification_id` | UUID string | Yes | Unique certificate identifier |
| `timestamp` | ISO-8601 string | Yes | Issuance timestamp |
| `issuer` | string | Yes | Always `"CertifiedData.io"` |
| `dataset_hash` | string | Yes | `sha256:<hex>` — hash of the certified dataset |
| `algorithm` | string | Yes | Generation algorithm (e.g. `"CTGAN"`) |
| `schema_version` | string | Yes | Schema version (e.g. `"cert.v2"`) |
| `rows` | integer | No | Row count of the synthetic dataset |
| `columns` | integer | No | Column count |
| `dataset_name` | string | No | Human-readable dataset name |
| `artifact_type` | string | No | Defaults to `"synthetic_dataset"` |
| `metadata` | object | No | Additional key-value metadata |

## Example payload

```json
{
  "certification_id": "c3a7e91b-4d2f-4a6b-b8f1-0e9a3c2d5f7e",
  "timestamp": "2026-03-30T18:22:00Z",
  "issuer": "CertifiedData.io",
  "dataset_hash": "sha256:a7f3c9221e3b8d04f1c2a85e6d7b9f301c4e8f2a3d5b6c9e0f1a2b3c4d5e6f7a",
  "algorithm": "CTGAN",
  "rows": 100000,
  "columns": 42,
  "dataset_name": "synthetic-patient-admissions-100k",
  "artifact_type": "synthetic_dataset",
  "schema_version": "cert.v2"
}
```

## Canonicalization

Before signing, the payload is canonicalized using:

```
json-stable-stringify(stripUndefined(payload)) → UTF-8 bytes
```

`json-stable-stringify` ensures deterministic key ordering. `stripUndefined` removes any `undefined` values recursively. The resulting UTF-8 bytes are what the Ed25519 signature covers.

This means: to verify independently, you must apply the same canonicalization before checking the signature. The `@certifieddata/verify` package handles this for you.

## Envelope structure

The full signed envelope returned by `GET /api/cert/:id/manifest`:

```json
{
  "payload": { ... },
  "signature": {
    "alg": "Ed25519",
    "key_id": "cd-prod-ed25519-2025-01",
    "value": "<base64-encoded-signature>"
  }
}
```

## Extension policy

Fields not listed above may appear in `metadata`. Third-party integrations should treat unknown top-level fields as optional. The `schema_version` field is the canonical way to detect capability.
