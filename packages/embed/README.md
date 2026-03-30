# @certifieddata/embed

TypeScript module for rendering CertifiedData.io verification badge widgets.

Mirrors the `embed.js` script-tag integration but as importable ES modules — for use in React, Vue, Svelte, or any TypeScript project.

## Install

```bash
npm install @certifieddata/embed @certifieddata/badge-types
```

## Quick start

```ts
import { renderBadge } from "@certifieddata/embed";

const container = document.getElementById("badge-root")!;
await renderBadge(container, {
  certId:  "your-certificate-uuid",
  variant: "inline",
  theme:   "dark",
});
```

## API

### `renderBadge(container, config)`

Fetches badge data from the CertifiedData API and mounts a badge widget into `container`.

```ts
import { renderBadge } from "@certifieddata/embed";
import type { BadgeConfig } from "@certifieddata/badge-types";

await renderBadge(element, config: BadgeConfig): Promise<void>
```

**Config options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `certId` | `string` | required | Certificate UUID |
| `variant` | `"compact" \| "inline" \| "full"` | `"inline"` | Badge layout |
| `theme` | `"light" \| "dark" \| "auto"` | `"dark"` | Color theme |
| `showHash` | `boolean` | `false` | Show artifact hash |
| `linkTarget` | `"_blank" \| "_self"` | `"_blank"` | Link behavior |
| `showMachineLinks` | `boolean` | `false` | Inject JSON-LD + meta tags |

### `fetchBadgeData(certId)`

Fetch raw badge data from the API without rendering:

```ts
import { fetchBadgeData } from "@certifieddata/embed";
import type { BadgeData } from "@certifieddata/badge-types";

const data: BadgeData = await fetchBadgeData("your-cert-uuid");
console.log(data.status);       // "active" | "revoked" | ...
console.log(data.is_verified);  // boolean
```

### `createBadgeElement(data, config)`

Create a badge DOM element without inserting it — useful when you control mount timing:

```ts
import { createBadgeElement } from "@certifieddata/embed";

const el = createBadgeElement(badgeData, { variant: "compact", theme: "light" });
document.body.appendChild(el);
```

## Badge variants

### `compact`
Single-line pill — issuer name + status icon. Minimal footprint.

### `inline` (default)
Two-line card — artifact name, verification status, hash, link to certificate.

### `full`
Expanded card — all fields including schema version, signature algorithm, signed payload link.

## Status rendering

The widget never shows positive verification claims ("Verified", "Signature Valid") for
certificates that are not actively verified. Status maps directly to what the issuer has recorded:

| Status | Display |
|---|---|
| `active` | Verified — current schema |
| `deprecated` | Verified — legacy schema |
| `pending` | Pending Review |
| `approved` | Approved |
| `revoked` | Revoked |
| `rejected` | Rejected |
| `invalid` | Unknown |

## Script tag alternative

For simple HTML pages without a build step, use `embed.js` instead:

```html
<script
  src="https://certifieddata.io/embed.js"
  data-cert-id="your-cert-uuid"
  data-variant="inline"
  data-theme="dark"
></script>
```

## License

MIT
