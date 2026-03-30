export interface SigningKey {
  key_id: string;
  algorithm: string;
  public_key_pem: string;
  status: "active" | "revoked";
  created_at?: string;
}

export interface SigningKeysResponse {
  keys: SigningKey[];
  issuer: string;
  documentation?: string;
}

export interface VerifyStatusResponse {
  cert_id: string;
  verified: boolean;
  status: string | null;
  signature_verified: boolean | null;
  alg: string | null;
  key_id: string | null;
  checked_at: string;
}

export interface SignedPayloadResponse {
  certificate_id: string;
  payload: Record<string, unknown>;
  signature: {
    alg: string;
    key_id: string | null;
    value: string | null;
  };
}

export interface RegistryEntry {
  id: string;
  title: string;
  artifact_type: string;
  certificate_id: string | null;
  certificate_url: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface RegistryEntriesResponse {
  entries: RegistryEntry[];
  total: number;
  page: number;
  per_page: number;
}

/** Result of verifyHash() — compares a local file hash against the certificate record */
export interface HashVerifyResult {
  /** True if the provided hash matches the certificate's recorded artifact hash */
  matched: boolean;
  /** The hash provided by the caller */
  provided_hash: string;
  /** The hash recorded on the certificate */
  certificate_hash: string;
  /** The certificate_id checked */
  certificate_id: string;
}
