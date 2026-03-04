#!/usr/bin/env python3
"""
CertifiedData.io Certificate Verifier — Python

Independently verify CertifiedData.io certificate manifests using Ed25519.

Accepts either:
  - A manifest.json file path (local verification from fixture)
  - Env var CERTIFIEDDATA_CERT_ID  (fetches live from certifieddata.io)

Usage:
  # Verify a local manifest file with a local keypair file (for testing fixtures)
  python verify.py manifest.json keypair.json

  # Verify a local manifest file with a PEM public key file
  python verify.py manifest.json --key-pem public_key.pem

  # Fetch + verify from live API
  CERTIFIEDDATA_CERT_ID=<cert-id> python verify.py

Dependencies: pip install cryptography requests
"""

import json
import sys
import os
import base64
import argparse
from pathlib import Path

# ── Canonicalization ──────────────────────────────────────────────────────────

def strip_undefined(obj):
    """Remove None values recursively (mirrors server-side stripUndefined)."""
    if obj is None:
        return None
    if isinstance(obj, list):
        return [strip_undefined(v) for v in obj]
    if isinstance(obj, dict):
        return {k: strip_undefined(v) for k, v in obj.items() if v is not None}
    return obj


def canonical_payload_bytes(payload: dict) -> bytes:
    """
    Produce canonical UTF-8 bytes for a CertifiedData payload.

    Mirrors server implementation:
      json-stable-stringify(stripUndefined(payload)) → UTF-8 bytes

    Python's json.dumps(sort_keys=True) produces the same output as
    json-stable-stringify for all values in a standard cert.v1 payload.
    """
    cleaned = strip_undefined(payload)
    canonical = json.dumps(cleaned, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return canonical.encode("utf-8")


# ── Ed25519 Verification ──────────────────────────────────────────────────────

def verify_ed25519_pem(payload_bytes: bytes, signature_b64: str, public_key_pem: str) -> bool:
    """Verify Ed25519 signature using PEM public key."""
    from cryptography.hazmat.primitives.serialization import load_pem_public_key
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    from cryptography.exceptions import InvalidSignature

    public_key = load_pem_public_key(public_key_pem.encode("utf-8"))
    if not isinstance(public_key, Ed25519PublicKey):
        raise ValueError(f"Expected Ed25519 public key, got {type(public_key).__name__}")

    signature = base64.b64decode(signature_b64)
    try:
        public_key.verify(signature, payload_bytes)
        return True
    except InvalidSignature:
        return False


# ── Envelope validation ───────────────────────────────────────────────────────

def validate_envelope(envelope: dict) -> dict | None:
    """Returns an error dict if shape is invalid, else None."""
    if not isinstance(envelope, dict):
        return {"verified": False, "reason": "Envelope is not an object"}
    if envelope.get("schema_version") not in ("certifieddata.manifest.v1", "sdaas.manifest.v1"):
        return {"verified": False, "reason": f"Unknown schema_version: {envelope.get('schema_version')}"}
    if not isinstance(envelope.get("payload"), dict):
        return {"verified": False, "reason": "Missing or invalid payload"}
    sig = envelope.get("signature")
    if not isinstance(sig, dict):
        return {"verified": False, "reason": "Missing signature object"}
    if sig.get("alg") != "Ed25519":
        return {
            "verified": False,
            "alg": sig.get("alg"),
            "reason": f"Unsupported algorithm: {sig.get('alg')}. Only Ed25519 is independently verifiable.",
        }
    if not sig.get("value"):
        return {"verified": False, "reason": "Missing signature.value"}
    return None


# ── Main verification function ────────────────────────────────────────────────

def verify_manifest(envelope: dict, public_key_pem: str, expected_key_id: str | None = None) -> dict:
    """
    Verify a CertifiedData manifest envelope.

    Args:
        envelope: Parsed JSON from GET /api/cert/:id/manifest
        public_key_pem: PEM-encoded Ed25519 public key
        expected_key_id: Optional — asserts signature.key_id matches

    Returns:
        {"verified": True, "alg": "Ed25519", "key_id": "..."} on success
        {"verified": False, "reason": "..."} on failure
    """
    err = validate_envelope(envelope)
    if err:
        return err

    sig = envelope["signature"]
    alg = sig["alg"]
    key_id = sig.get("key_id")
    signature_b64 = sig["value"]

    if expected_key_id and key_id != expected_key_id:
        return {
            "verified": False,
            "alg": alg,
            "key_id": key_id,
            "reason": f"key_id mismatch: expected '{expected_key_id}', got '{key_id}'",
        }

    payload_bytes = canonical_payload_bytes(envelope["payload"])

    try:
        ok = verify_ed25519_pem(payload_bytes, signature_b64, public_key_pem)
    except Exception as e:
        return {"verified": False, "alg": alg, "key_id": key_id, "reason": str(e)}

    if not ok:
        return {"verified": False, "alg": alg, "key_id": key_id, "reason": "Signature verification failed"}

    return {"verified": True, "alg": alg, "key_id": key_id}


# ── CLI ───────────────────────────────────────────────────────────────────────

def load_pem_from_keypair_json(keypair_path: str) -> str:
    """Load public_key_pem from a keypair.json fixture file."""
    with open(keypair_path) as f:
        kp = json.load(f)
    pem = kp.get("public_key_pem")
    if not pem:
        raise ValueError(f"No 'public_key_pem' field in {keypair_path}")
    return pem


def fetch_from_live_api(cert_id: str, base_url: str = "https://certifieddata.io") -> tuple[dict, str]:
    """Fetch manifest + resolve public key from live CertifiedData.io API."""
    import requests

    manifest_url = f"{base_url}/api/cert/{cert_id}/manifest"
    keys_url = f"{base_url}/.well-known/signing-keys.json"

    print(f"[certifieddata-verify] Fetching manifest: {manifest_url}")
    manifest_res = requests.get(manifest_url, headers={"Accept": "application/certifieddata.manifest+json"})
    manifest_res.raise_for_status()
    envelope = manifest_res.json()

    print(f"[certifieddata-verify] Fetching signing keys: {keys_url}")
    keys_res = requests.get(keys_url)
    keys_res.raise_for_status()
    keys_body = keys_res.json()

    key_id = envelope.get("signature", {}).get("key_id")
    key_entry = next((k for k in keys_body.get("keys", []) if k["key_id"] == key_id), None)
    if not key_entry:
        available = [k["key_id"] for k in keys_body.get("keys", [])]
        raise ValueError(f"No public key found for key_id='{key_id}'. Available: {available}")
    if key_entry.get("status") != "active":
        raise ValueError(f"Signing key '{key_id}' is {key_entry.get('status')}, not active")

    return envelope, key_entry["public_key_pem"]


def main():
    parser = argparse.ArgumentParser(
        description="Independently verify a CertifiedData.io certificate manifest"
    )
    parser.add_argument(
        "manifest",
        nargs="?",
        help="Path to manifest JSON file (omit to fetch from live API via CERTIFIEDDATA_CERT_ID env var)",
    )
    parser.add_argument(
        "keypair_or_pem",
        nargs="?",
        help="Path to keypair.json (fixture) or PEM public key file",
    )
    parser.add_argument("--key-pem", help="Path to PEM public key file (alternative to positional arg)")
    parser.add_argument("--expected-key-id", help="Assert that signature.key_id matches this value")
    parser.add_argument("--base-url", default="https://certifieddata.io", help="CertifiedData.io API base URL")
    args = parser.parse_args()

    cert_id = os.environ.get("CERTIFIEDDATA_CERT_ID")

    if not args.manifest and not cert_id:
        parser.error("Provide a manifest file path or set CERTIFIEDDATA_CERT_ID env var")

    # Load envelope + public key
    if args.manifest:
        with open(args.manifest) as f:
            envelope = json.load(f)

        key_path = args.keypair_or_pem or args.key_pem
        if not key_path:
            parser.error("Provide keypair.json or --key-pem when verifying a local manifest")

        if key_path.endswith(".json"):
            public_key_pem = load_pem_from_keypair_json(key_path)
        else:
            public_key_pem = Path(key_path).read_text()
    else:
        envelope, public_key_pem = fetch_from_live_api(cert_id, args.base_url)

    expected_key_id = args.expected_key_id or os.environ.get("CERTIFIEDDATA_EXPECTED_KEY_ID")

    result = verify_manifest(envelope, public_key_pem, expected_key_id)

    print(json.dumps(result, indent=2))
    sys.exit(0 if result["verified"] else 1)


if __name__ == "__main__":
    main()
