# Verification Badges

CertifiedData.io badges are a visual expression of a cryptographic artifact. They do not replace the underlying certificate — they link to it and reflect its current state.

## Badge states

| State | Color | Meaning |
|---|---|---|
| `active` | Green | Certificate is ISSUED and the schema is current |
| `deprecated` | Amber | Certificate is ISSUED but uses an older schema version |
| `revoked` | Red | Certificate has been REVOKED |
| `invalid` | Gray | Certificate exists but is not in an issuable state |
| `unavailable` | Gray | API fetch failed or certificate not found |

## Install methods

### Script tag (recommended)

Zero-config install. `embed.js` injects the widget before the tag and removes the tag.

```html
<script
  src="https://certifieddata.io/embed.js"
  data-cert-id="YOUR_CERT_ID"
  data-variant="inline"
  data-theme="dark">
</script>
```

### iframe (CSP-safe)

No JavaScript executes on your page. Suitable for strict CSP environments.

```html
<iframe
  src="https://certifieddata.io/embed/YOUR_CERT_ID?size=compact&theme=dark"
  width="260"
  height="28"
  title="CertifiedData Certificate Badge"
  loading="lazy">
</iframe>
```

### SVG badge (static)

For READMEs, email, or any context where JavaScript is not available.

```markdown
![CertifiedData Certified](https://certifieddata.io/badge/YOUR_CERT_ID.svg)
```

```html
<img src="https://certifieddata.io/badge/YOUR_CERT_ID.svg" alt="CertifiedData Certified" height="20" />
```

## Widget variants

| Variant | Description |
|---|---|
| `compact` | Pill badge with dot and label — minimal footprint |
| `inline` | Badge with checkmark, title, and artifact name |
| `full` | Full trust card with metadata rows |

## Data attributes for embed.js

| Attribute | Values | Default |
|---|---|---|
| `data-cert-id` | UUID (required) | — |
| `data-variant` | `compact` / `inline` / `full` | `inline` |
| `data-theme` | `light` / `dark` / `auto` | `dark` |
| `data-show-hash` | `true` / `false` | `false` |
| `data-link-target` | `_blank` / `_self` | `_blank` |
| `data-show-machine-links` | `true` / `false` | `false` |

## Machine-readable layer

When `data-show-machine-links="true"`, `embed.js` injects:

- JSON-LD `<script type="application/ld+json">` with `@type: Dataset`
- `<meta name="certifieddata:cert_id">` tag

This allows search crawlers and AI agents to discover the certificate without parsing the badge UI.

## Analytics

`embed.js` fires fire-and-forget events to `POST /api/badge/:id/track`:

- `impression` — on widget render
- `click` — when user clicks through to the certificate

No cookies. No PII. Source URL is collected only to attribute distribution to domains.
