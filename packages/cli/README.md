# @certifieddata/cli

Unified command-line for the CertifiedData.io developer journey:

1. **scan** — detect PII locally
2. **generate** — hand off to the certified-synthetic workflow
3. **verify** — confirm a certificate offline

```bash
npm i -g @certifieddata/cli

certifieddata pii-scan ./customers.csv --emit-handoff --output-handoff handoff.json
certifieddata generate --handoff handoff.json
certifieddata verify ./certificate-bundle.zip
```

## Design rules

- **Local-first.** `pii-scan` and `verify` never touch the network.
- **No IP in public repos.** `generate` is a thin web-handoff — it never
  uploads file contents and does not embed any proprietary generation API.
  To complete generation, sign in on the web or use the documented public
  API directly with your API key.
- **Aggregate-only deeplinks.** The continue-generation URL carries only
  overall counts and risk level. Column names, samples, and raw rows never
  appear in a URL.
- **Offline verification.** `verify` operates on a manifest file, an
  unpacked bundle directory, or a bundle zip — using only locally-supplied
  public keys. Online revocation/key discovery belongs to `@certifieddata/sdk`.

## Commands

### `certifieddata pii-scan <file>`

Thin wrapper over [`@certifieddata/pii-scan`](../pii-scan/). Supports:

- `--json` – findings as JSON
- `--sarif` – findings as SARIF 2.1.0 (GitHub Code Scanning compatible)
- `--emit-handoff` – print a sanitized handoff JSON
- `--output-handoff <path>` – write the handoff JSON to disk
- `--open-generate` – open the generation workflow in a browser
- `--base-url <url>` – override the handoff base URL

### `certifieddata generate <file|handoff>`

Opens the generation workflow in a browser with a sanitized handoff payload
as URL params. Reads either:

- a raw dataset file (scanned locally on the fly), or
- a pii-scan handoff JSON (`--handoff <path>` or positional), or
- a handoff piped via stdin.

Flags:

- `--dry-run` / `--no-open` – print the URL instead of opening it
- `--base-url <url>` – override the generation base URL

### `certifieddata verify <artifact>`

Verifies offline:

- `.json` – signed manifest envelope
- `.zip` – zipped certificate bundle (`certificate.json` + `public_key.pem`)
- directory – unpacked bundle

Flags:

- `--public-key <pem-path>` – override key lookup
- `--expected-key-id <id>` – assert the signature key_id
- `--json` – emit the structured `VerifyResult`

### `certifieddata registry`

Browses public registry entries via the documented public API (from
`@certifieddata/sdk`).

## License

MIT — see [../../LICENSE](../../LICENSE).
