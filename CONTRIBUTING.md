# Contributing

Thank you for your interest in contributing to `sdaas-public`. This repository contains open-source verification tools for the [CertifiedData.io](https://certifieddata.io) platform.

---

## What lives here

| Package | Purpose |
|---------|---------|
| `@certifieddata/verify` | Core Ed25519 signature verification logic |
| `@certifieddata/sdk` | High-level client (`fetchAndVerify`) |
| `@certifieddata/schema-gen` | Certificate JSON schema and codegen utilities |
| `@certifieddata/pii-scan` | Local PII risk scanner for datasets |
| `examples/` | Reference implementations (Node.js, Python, CI) |
| `docs/` | Technical documentation |

---

## What does NOT live here

- The CertifiedData.io platform backend (closed source)
- The synthetic data generation models
- Any private keys or signing secrets
- Customer data or certificates

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

```bash
npm install -g pnpm
pnpm install
pnpm build
```

### Running tests

```bash
pnpm test
```

This runs the verification tests against the fixture manifests in `examples/fixtures/`.

---

## Contributing guidelines

### Bug reports

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Your Node.js version and OS
- A minimal reproduction (file or snippet)

### Pull requests

1. Fork the repository and create a branch from `main`
2. Make your changes
3. Add or update tests if applicable
4. Run `pnpm test` to confirm tests pass
5. Open a PR with a clear description of the change

### Code style

- TypeScript for all packages
- No external runtime dependencies in `@certifieddata/verify` (keep it zero-dep for verifiability)
- Follow the existing patterns in each package

---

## Scope of contributions

We welcome contributions that improve:
- Verification correctness and edge case handling
- Additional language examples (Go, Rust, Java, etc.)
- Documentation clarity
- PII detection patterns in `@certifieddata/pii-scan`
- CI/CD integration examples

We are unlikely to accept contributions that:
- Change the core `cert.v1` schema in a breaking way
- Add telemetry or network calls to `@certifieddata/pii-scan`
- Depend on the closed-source CertifiedData.io backend

---

## Security issues

Do not open a public issue for security vulnerabilities. Email **security@certifieddata.io** instead. See [SECURITY.md](./SECURITY.md).

---

## License

All contributions to this repository are licensed under the MIT License. By submitting a PR, you agree that your contribution will be licensed under the same terms.
