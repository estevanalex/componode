export interface OidcConfig {
  enabled: boolean;
  issuer?: string | null;
  clientId?: string | null;
  clientSecretRef?: string | null;
  roleClaimPath?: string | null;
  claimValueField?: string | null;
  roleMapping?: Record<string, string> | null;
  updatedAt: string;
}
