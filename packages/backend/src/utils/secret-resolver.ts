import type { SecretResolver } from "@componode/core";

/**
 * Environment-based SecretResolver (ADR-055).
 * Resolves references in the format "env:VAR_NAME" by reading from process.env.
 * This is the v1 default resolver. Vault/AWS SM resolvers are post-v1.
 */
export class EnvSecretResolver implements SecretResolver {
  async resolve(ref: string): Promise<string> {
    if (!ref.startsWith("env:")) {
      throw new Error(`Unsupported secret reference format: ${ref}. Expected "env:VAR_NAME".`);
    }
    const envVar = ref.slice(4);
    const value = process.env[envVar];
    if (value === undefined || value === "") {
      throw new Error(`Secret environment variable not set: ${envVar}`);
    }
    return value;
  }
}
