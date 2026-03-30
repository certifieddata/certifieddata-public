import type { CertifiedDataManifestEnvelope, VerifyResult } from "@certifieddata/verify";
import { verifyManifest } from "@certifieddata/verify";
import type {
  SigningKeysResponse,
  VerifyStatusResponse,
  SignedPayloadResponse,
  RegistryEntriesResponse,
  HashVerifyResult,
} from "./types.js";

export class CertifiedDataClient {
  constructor(private baseUrl: string = "https://certifieddata.io") {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Fetch the signed manifest envelope for a certificate.
   * The envelope contains the payload (what was signed) + the detached signature.
   *
   * Endpoint: GET /api/cert/:id/manifest
   * Content-Type: application/certifieddata.manifest+json
   */
  async fetchManifest(certId: string): Promise<CertifiedDataManifestEnvelope> {
    const url = `${this.baseUrl}/api/cert/${certId}/manifest`;
    const res = await fetch(url, {
      headers: { Accept: "application/certifieddata.manifest+json" },
    });
    if (!res.ok) {
      throw new Error(`fetchManifest(${certId}) failed: HTTP ${res.status}`);
    }
    return (await res.json()) as CertifiedDataManifestEnvelope;
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
   * Fetch the raw signed payload for a certificate.
   * Returns the payload object and its detached signature — useful for
   * archiving, auditing, or independent re-verification.
   *
   * Endpoint: GET /api/certificates/:id/signed-payload
   */
  async getSignedPayload(certId: string): Promise<SignedPayloadResponse> {
    const url = `${this.baseUrl}/api/certificates/${certId}/signed-payload`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`getSignedPayload(${certId}) failed: HTTP ${res.status}`);
    }
    return (await res.json()) as SignedPayloadResponse;
  }

  /**
   * Fetch paginated registry entries (public artifact listings).
   *
   * Endpoint: GET /api/registry/entries
   *
   * @param opts.page     Page number (1-based, default 1)
   * @param opts.perPage  Results per page (default 20, max 100)
   * @param opts.type     Filter by artifact type (e.g. "synthetic_dataset")
   */
  async getRegistryEntries(opts: {
    page?: number;
    perPage?: number;
    type?: string;
  } = {}): Promise<RegistryEntriesResponse> {
    const params = new URLSearchParams();
    if (opts.page)    params.set("page",     String(opts.page));
    if (opts.perPage) params.set("per_page", String(opts.perPage));
    if (opts.type)    params.set("type",     opts.type);

    const url = `${this.baseUrl}/api/registry/entries?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`getRegistryEntries failed: HTTP ${res.status}`);
    }
    return (await res.json()) as RegistryEntriesResponse;
  }

  /**
   * Compare a locally-computed SHA-256 hash against the hash recorded on
   * a certificate. Useful for verifying that a downloaded file matches
   * what was certified, without trusting any server claim.
   *
   * @param certId        The certificate UUID to check against
   * @param artifactHash  SHA-256 hex string of the local file (with or without "sha256:" prefix)
   */
  async verifyHash(certId: string, artifactHash: string): Promise<HashVerifyResult> {
    const payload = await this.getSignedPayload(certId);

    // Normalize: strip "sha256:" prefix from both sides for comparison
    const normalize = (h: string) => h.replace(/^sha256:/i, "").toLowerCase().trim();

    const provided = normalize(artifactHash);

    // The signed payload may store the hash at payload.hashes.datasets[...].sha256
    // or at the legacy payload.dataset_hash field
    const certHash = extractHash(payload);
    const cert = normalize(certHash ?? "");

    return {
      matched:          provided === cert && cert.length > 0,
      provided_hash:    provided,
      certificate_hash: cert,
      certificate_id:   certId,
    };
  }

  /**
   * Fetch a manifest and independently verify its Ed25519 signature
   * against the published public key.
   *
   * This performs full client-side cryptographic verification —
   * no trust in CertifiedData server response required.
   */
  async fetchAndVerify(certId: string): Promise<{
    manifest: CertifiedDataManifestEnvelope;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the artifact hash from a signed payload response.
 * Handles both the current nested hashes format and the legacy dataset_hash field.
 */
function extractHash(payload: SignedPayloadResponse): string | null {
  const p = payload.payload as Record<string, unknown>;

  // Current format: payload.hashes.datasets.<key>.sha256
  const hashes = p.hashes as Record<string, unknown> | undefined;
  if (hashes && typeof hashes === "object") {
    const datasets = hashes.datasets as Record<string, { sha256?: string }> | undefined;
    if (datasets) {
      const first = Object.values(datasets)[0];
      if (first?.sha256) return first.sha256;
    }
  }

  // Legacy format: payload.dataset_hash
  if (typeof p.dataset_hash === "string") return p.dataset_hash;

  return null;
}
