export interface SecretRef {
  key: string;
  env?: string;
  file?: string;
}

export class EnvSecretResolver {
  async resolve(ref: SecretRef): Promise<string> {
    if (ref.env !== undefined) {
      const value = process.env[ref.env];
      if (value === undefined || value === "") {
        throw new Error(`Secret environment variable not set: ${ref.env}`);
      }
      return value;
    }

    if (ref.file !== undefined) {
      const { readFile } = await import("node:fs/promises");
      return (await readFile(ref.file, "utf8")).trim();
    }

    throw new Error("Secret ref must include env or file");
  }
}

const resolver = new EnvSecretResolver();

export async function resolveSecrets(
  secretRefs: Array<SecretRef> | null | undefined,
): Promise<Record<string, string>> {
  if (!secretRefs) {
    return {};
  }

  const secrets: Record<string, string> = {};

  for (const ref of secretRefs) {
    secrets[ref.key] = await resolver.resolve(ref);
  }

  return secrets;
}

export function redactSecrets(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > 0) {
      output[key] = "***REDACTED***";
    } else if (typeof value === "object" && value !== null) {
      output[key] = redactSecrets(value as Record<string, unknown>);
    } else {
      output[key] = value;
    }
  }
  return output;
}
