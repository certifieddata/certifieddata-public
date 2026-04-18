# Pricing and tiers

This page describes what is free and local, what requires a hosted
CertifiedData.io account, and how to evaluate the product without
leaving the repo.

This document intentionally does not quote specific prices or quotas — those
live on [certifieddata.io](https://certifieddata.io) and change independently
of this repo. This page pins down **what is local and free vs. what is
hosted** so you can evaluate the engineering surface before talking to us.

---

## Local, free, no account required

The following packages in this repository are MIT-licensed, run entirely on
your own machine, and do not require a CertifiedData.io account:

| Package | What it does | Network calls |
|---|---|---|
| [`@certifieddata/pii-scan`](../packages/pii-scan/) | Scan CSV/JSON for likely PII | None |
| [`@certifieddata/verify`](../packages/verify/) | Verify a signed manifest using a public key | None |
| [`@certifieddata/cli`](../packages/cli/) `pii-scan` / `verify` subcommands | CLI wrappers for the above | None |
| [`@certifieddata/schemas`](../packages/schemas/) | Shared type definitions | None |

These packages are safe to run in air-gapped environments. They do not
phone home, do not collect telemetry, and do not read any file you did not
explicitly pass on the command line.

---

## Hosted — requires a CertifiedData.io account

The following capabilities require an account on
[certifieddata.io](https://certifieddata.io):

| Capability | Why hosted |
|---|---|
| Generating certified synthetic datasets | The generation engine is a hosted service. |
| Issuing Ed25519-signed certificates | Signing keys are held in CertifiedData infrastructure. |
| Publishing to the public registry | Publication is moderated. |
| Online revocation lookups | Revocation state is centrally managed. |

The public API is documented in [`../openapi/openapi.yaml`](../openapi/openapi.yaml).
[`@certifieddata/sdk`](../packages/sdk/) is a thin client for the read-only
endpoints of that API; it does not include a generation client.

---

## `certifieddata generate` CLI

The `generate` subcommand in [`@certifieddata/cli`](../packages/cli/) is a
**browser handoff** — it does not upload datasets and does not embed the
proprietary generation API. It either:

1. reads a sanitized handoff summary from `pii-scan`, or
2. scans a file locally and builds a handoff summary,

then opens a pre-filled URL on certifieddata.io so you can continue the
workflow signed in. This keeps the public OSS surface clean of hosted-API
details.

If you want a programmatic generation flow, use the public API with your
account's API key. That path is not documented in this repository because
it is not part of the OSS surface.

---

## Evaluating without an account

You can validate the full verification story end-to-end without any account:

```bash
pnpm install && pnpm build
cd examples/node-verify && node index.mjs valid          # should verify
node index.mjs tampered || echo "correctly rejected"
```

The fixtures in [`examples/fixtures/`](../examples/fixtures/) include a
valid manifest, a tampered one, a bad-signature one, and more — all signed
with a throwaway test key that ships in the repo.

---

## Cost of verification

There is no cost or quota on verification. It runs entirely client-side:

- Verify a manifest using `@certifieddata/verify` in Node, browser, Deno, or Bun.
- Verify with Python using [`examples/python-verify/`](../examples/python-verify/).
- Verify an unpacked or zipped certificate bundle offline using
  `@certifieddata/cli verify`.

If CertifiedData.io becomes unavailable, you can still verify any
previously-issued certificate bundle with no network access, provided you
have the manifest and the public key (both ship in the bundle zip).

---

## What to ask the CertifiedData.io team

Because prices and quotas change, the right next step for evaluation is:

1. Check [certifieddata.io](https://certifieddata.io) for current tiers.
2. Contact the CertifiedData team for enterprise quotas, SLAs, or
   air-gapped deployment options.
3. Use this repo to verify the technical posture matches your
   requirements for independence, cryptographic review, and offline
   verification.
