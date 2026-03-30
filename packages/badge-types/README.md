# @certifieddata/badge-types

Shared TypeScript types for the CertifiedData.io badge and embed system.

Used by `@certifieddata/embed`, `embed.js`, and partner badge integrations.

## Install

```bash
npm install @certifieddata/badge-types
```

## Usage

```ts
import type { BadgeData, BadgeStatus, BadgeConfig } from "@certifieddata/badge-types";

// Type the response from GET /api/badge/:certId
const badge: BadgeData = await fetch(`https://certifieddata.io/api/badge/${certId}`)
  .then(r => r.json());

console.log(badge.status);        // "active" | "deprecated" | "revoked" | ...
console.log(badge.is_verified);   // true if status is "active" or "deprecated"
console.log(badge.hash_short);    // "a7f3c9...91e2"
```

## Types

### `BadgeStatus`

```ts
type BadgeStatus =
  | "active"      // ISSUED cert, current schema version
  | "deprecated"  // ISSUED cert, older schema version
  | "pending"     // REQUESTED or PENDING_REVIEW
  | "approved"    // APPROVED but not yet ISSUED
  | "revoked"     // Revoked by issuer
  | "rejected"    // Certification rejected
  | "invalid"     // Unrecognised state
  | "unavailable" // Could not fetch badge data
```

### `BadgeData`

Full response shape from `GET /api/badge/:certId`:

```ts
interface BadgeData {
  certificate_id:      string;
  artifact_name:       string | null;
  artifact_type:       string;
  artifact_type_label: string;
  certificate_url:     string;
  issued_at:           string;        // ISO-8601
  status_changed_at:   string;        // ISO-8601
  issuer:              string;
  schema_version:      string;
  status:              BadgeStatus;
  is_verified:         boolean;
  is_deprecated:       boolean;
  hash_algorithm:      string;
  signature_algorithm: string;
  hash_short:          string;        // "a7f3c9...91e2"
  hash_full:           string;        // full hex hash
  signed_payload_url:  string;
  verification_url:    string;
  signing_keys_url:    string;
}
```

### `BadgeVariant`

```ts
type BadgeVariant = "compact" | "inline" | "full";
```

### `BadgeTheme`

```ts
type BadgeTheme = "light" | "dark" | "auto";
```

### `BadgeConfig`

Configuration for rendering a badge widget:

```ts
interface BadgeConfig {
  certId:          string;
  variant?:        BadgeVariant;  // default: "inline"
  theme?:          BadgeTheme;    // default: "dark"
  showHash?:       boolean;       // default: false
  linkTarget?:     "_blank" | "_self";  // default: "_blank"
  showMachineLinks?: boolean;     // inject JSON-LD + meta tags, default: false
}
```

## License

MIT
