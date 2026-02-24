import type { SdaasManifestEnvelope, VerifyResult } from "@certifieddata/verify";
import { verifyManifest } from "@certifieddata/verify";
import type { SigningKeysResponse, VerifyStatusResponse } from "./types.js";

export class SdaasClient {
  constructor(private baseUrl: string = "https://certifieddata.io") {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Fetch the signed manifest envelope for a certificate.
   * The envelope contains the payload (what was signed) + the detached signature.
   *
   * Endpoint: GET /api/cert/:id/manifest
   * Content-Type: application/sdaas.manifest+json
   */
  async fetchManifest(certId: string): Promise<SdaasManifestEnvelope> {
    const url = `${this.baseUrl}/api/cert/${certId}/manifest`;
    const res = await fetch(url, {
      headers: { Accept: "application/sdaas.manifest+json" },
    });
    if (!res.ok) {
      throw new Error(`fetchManifest(${certId}) failed: HTTP ${res.status}`);
    }
    return (await res.json()) as SdaasManifestEnvelope;
  }

  /**
   * Fetch the server-side verification status for a certificate.
   * Useful for polling revocation status or checking cert health.
   *
   * Endpoint: GET /verify/:id/status
   */
  async fetchVerifyStatus(certId: string): Promise<VerifyStatusResponse> {
    const url = `${this.baseUrl}/verify/${certId}/status`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`fetchVerifyStatus(${certId}) failed: HTTP ${res.status}`);
    }
    return (await res.json()) as VerifyStatusResponse;
  }

  /**
   * Fetch the list of active signing public keys.
   *
   * Endpoint: GET /.well-known/signing-keys.json
   */
  async fetchSigningKeys(): Promise<SigningKeysResponse> {
    const url = `${this.baseUrl}/.well-known/signing-keys.json`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`fetchSigningKeys failed: HTTP ${res.status}`);
    }
    return (await res.json()) as SigningKeysResponse;
  }

  /**
   * Fetch a manifest and independently verify its Ed25519 signature
   * against the published public key.
   *
   * This performs full client-side cryptographic verification —
   * no trust in CertifiedData server response required.
   */
  async fetchAndVerify(certId: string): Promise<{
    manifest: SdaasManifestEnvelope;
    result: VerifyResult;
  }> {
    const [manifest, keysResp] = await Promise.all([
      this.fetchManifest(certId),
      this.fetchSigningKeys(),
    ]);

    const keyId = manifest.signature?.key_id;
    const key = keysResp.keys.find((k) => k.key_id === keyId);

    if (!key) {
      return {
        manifest,
        result: {
          verified: false,
          key_id: keyId,
          reason: `No public key found for key_id="${keyId}". Keys available: ${keysResp.keys.map((k) => k.key_id).join(", ")}`,
        },
      };
    }

    if (key.status !== "active") {
      return {
        manifest,
        result: {
          verified: false,
          key_id: keyId,
          alg: key.algorithm,
          reason: `Signing key "${keyId}" is ${key.status}, not active`,
        },
      };
    }

    const result = await verifyManifest(manifest, key.public_key_pem, keyId ?? undefined);
    return { manifest, result };
  }
}
