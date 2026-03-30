# Browser Certificate Verification

A zero-dependency HTML page that independently verifies a CertifiedData certificate using the browser's built-in Web Crypto API.

No npm install. No build step. Open `index.html` in any modern browser.

## What it does

1. Fetches the signed manifest from `GET /api/cert/:id/manifest`
2. Fetches the public signing key from `GET /.well-known/signing-keys.json`
3. Canonicalizes the payload (alphabetical key sort, strip undefined)
4. Verifies the Ed25519 signature using `SubtleCrypto.verify`

The verification runs entirely client-side. No data leaves the browser except the two read-only API requests to `certifieddata.io`.

## Usage

```bash
# Just open the file — no server needed for static use
open index.html

# Or serve locally if you need CORS headers
npx serve .
```

Enter a certificate UUID and click **Verify Certificate**.

## Browser requirements

| Feature | Minimum version |
|---|---|
| `SubtleCrypto.verify` (Ed25519) | Chrome 113+, Firefox 113+, Safari 17+ |
| ES modules in `<script type="module">` | All modern browsers |

For older browsers, use the [Node.js example](../node-verify/) or [CI script](../ci-verify/) instead.

## Canonical form

The payload is canonicalized before signing:
- Keys sorted alphabetically at every level
- `undefined` values stripped
- No trailing whitespace

This matches the server-side implementation in `@certifieddata/verify` and `examples/ci-verify/verify.mjs`.

## Related examples

- [node-verify/](../node-verify/) — Node.js verification using `@certifieddata/verify`
- [ci-verify/](../ci-verify/) — Standalone shell-friendly CI script
- [node-fetch-and-verify/](../node-fetch-and-verify/) — SDK convenience wrapper
