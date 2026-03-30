# Embed Guide

How to add a CertifiedData verification badge to any website, app, or document.

## Quick install

```html
<!-- Inline badge — one line -->
<script src="https://certifieddata.io/embed.js" data-cert-id="YOUR_CERT_ID"></script>
```

That's it. `embed.js` injects the badge widget before the tag and removes the tag.

## Install methods

### Method 1 — Script tag

Best for most use cases. Works on any HTML page.

```html
<script
  src="https://certifieddata.io/embed.js"
  data-cert-id="YOUR_CERT_ID"
  data-variant="inline"
  data-theme="dark">
</script>
```

The script:
1. Locates all `<script data-cert-id>` tags on the page
2. Creates a `<div class="cd-badge-root">` placeholder
3. Injects scoped CSS once
4. Fetches `GET /api/badge/:id` to get live badge data
5. Renders the widget
6. Fires an impression event

### Method 2 — iframe

CSP-safe. No JavaScript runs on your page.

```html
<iframe
  src="https://certifieddata.io/embed/YOUR_CERT_ID?size=compact&theme=dark"
  width="260"
  height="28"
  title="CertifiedData Certificate Badge"
  loading="lazy">
</iframe>
```

Add to your CSP:
```
Content-Security-Policy: frame-src https://certifieddata.io;
```

### Method 3 — SVG badge

For READMEs, email signatures, and anywhere JavaScript is unavailable.

```markdown
[![CertifiedData Certified](https://certifieddata.io/badge/YOUR_CERT_ID.svg)](https://certifieddata.io/certificate/YOUR_CERT_ID)
```

### Method 4 — TypeScript module (`@certifieddata/embed`)

For React, Vue, Svelte, or any framework:

```ts
import { renderBadge } from "@certifieddata/embed";

const container = document.getElementById("badge-container")!;
await renderBadge(container, {
  certId: "YOUR_CERT_ID",
  variant: "inline",
  theme: "dark",
});
```

Install:
```bash
pnpm add @certifieddata/embed
```

## Widget variants

### compact
Minimal pill badge. Good for dense UIs or sidebars.

### inline (default)
Checkmark + title + artifact name. Works in most page contexts.

### full
Full trust card with issuer, type, date, hash, and algorithm. Use for certification showcase pages.

## Theming

| Value | Behavior |
|---|---|
| `dark` | Dark background, zinc text |
| `light` | White background, dark text |
| `auto` | Follows `prefers-color-scheme` |

## Framework examples

### React

```tsx
import { useEffect, useRef } from "react";
import { renderBadge } from "@certifieddata/embed";

export function CertBadge({ certId }: { certId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      renderBadge(ref.current, { certId, variant: "inline", theme: "dark" });
    }
  }, [certId]);

  return <div ref={ref} />;
}
```

### Next.js (client component)

```tsx
"use client";
import { useEffect, useRef } from "react";
import { renderBadge } from "@certifieddata/embed";

export function CertBadge({ certId }: { certId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) renderBadge(ref.current, { certId });
  }, [certId]);
  return <div ref={ref} />;
}
```

## Badge API endpoint

`GET /api/badge/:id` — the data source powering all embed variants.

- CORS enabled (`Access-Control-Allow-Origin: *`)
- Cached 5 min for active certs
- `no-store` for revoked/invalid

Full response schema in [openapi.yaml](../openapi/openapi.yaml).
