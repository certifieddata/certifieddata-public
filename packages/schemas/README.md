# @certifieddata/schemas

Canonical public certificate schema definitions for CertifiedData.io.

Single source of truth for:
- Schema version constants and lifecycle metadata
- `CertificatePayload` TypeScript type
- `parseCertificatePayload()` validator
- JSON Schema object (draft-07) for tooling integration

## Install

```bash
npm install @certifieddata/schemas
```

## Usage

```ts
import {
  ACTIVE_SCHEMA_VERSION,
  isSupportedSchemaVersion,
  isDeprecatedSchemaVersion,
  parseCertificatePayload,
  CERTIFICATE_PAYLOAD_JSON_SCHEMA,
} from "@certifieddata/schemas";

// Check if a version string is known
isSupportedSchemaVersion("cert.v2");  // true
isSupportedSchemaVersion("cert.v0");  // false

// Check if a version is deprecated (issued, but no longer current)
isDeprecatedSchemaVersion("cert.v1"); // true
isDeprecatedSchemaVersion("cert.v2"); // false

// Parse and validate a payload object from the API or a manifest file
const result = parseCertificatePayload(rawPayload);
if (result.ok) {
  console.log(result.value.certificate_id);
  console.log(result.value.issued_at);
} else {
  console.error(result.reason);
}
```

## API

### Constants

```ts
ACTIVE_SCHEMA_VERSION       // "cert.v2"
ALL_SCHEMA_VERSIONS         // ["cert.v1", "cert.v2"]
DEPRECATED_SCHEMA_VERSIONS  // ["cert.v1"]
```

### Types

```ts
type SchemaVersion = "cert.v1" | "cert.v2";

interface CertificatePayload {
  certificate_id:  string;        // Certificate UUID
  issued_at:       string;        // ISO-8601 timestamp
  issuer:          string;        // "CertifiedData.io"
  dataset_hash:    string;        // "sha256:abc123..."
  algorithm:       string;        // "CTGAN"
  schema_version:  SchemaVersion;
  rows?:           number;
  columns?:        number;
  dataset_name?:   string;
  artifact_type?:  string;        // default: "synthetic_dataset"
  metadata?:       Record<string, unknown>;
}

interface SignedCertificateEnvelope {
  payload: CertificatePayload;
  signature: {
    alg:    string;
    key_id: string;
    value:  string | null;  // Base64-encoded Ed25519 signature
  };
}
```

### `isSupportedSchemaVersion(version)`

Returns `true` if `version` is a known and supported schema version.

### `isDeprecatedSchemaVersion(version)`

Returns `true` if `version` is deprecated (still verifiable, but no longer issued to new certs).

### `parseCertificatePayload(raw)`

Parse and validate an unknown object as a `CertificatePayload`. Returns:
- `{ ok: true, value: CertificatePayload }` on success
- `{ ok: false, reason: string }` on failure

### `CERTIFICATE_PAYLOAD_JSON_SCHEMA`

JSON Schema (draft-07) object describing `CertificatePayload`. Use with `ajv`, `jsonschema`, or any JSON Schema validator:

```ts
import Ajv from "ajv";
import { CERTIFICATE_PAYLOAD_JSON_SCHEMA } from "@certifieddata/schemas";

const ajv = new Ajv();
const validate = ajv.compile(CERTIFICATE_PAYLOAD_JSON_SCHEMA);
const valid = validate(payload);
```

## Field naming

All field names in this package match the CertifiedData REST API response format:

| This package | API field |
|---|---|
| `certificate_id` | `certificate_id` |
| `issued_at` | `issued_at` |
| `dataset_hash` | `dataset_hash` |

## Related packages

- [`@certifieddata/verify`](../verify) — Ed25519 signature verification
- [`@certifieddata/sdk`](../sdk) — fetch + verify convenience client

## License

MIT
