export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export async function generateUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const normalized = slugify(base);
  if (normalized === "" || !(await exists(normalized))) {
    return normalized || "unknown";
  }

  for (let i = 2; i < 1000; i++) {
    const candidate = `${normalized}-${i}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  // Last-resort fallback to avoid infinite loops
  return `${normalized}-${Date.now()}`;
}

export function generateComponentSlug(name: string, externalId: string): string {
  const fromName = slugify(name);
  if (fromName.length > 0) {
    return fromName;
  }
  const fromExternal = slugify(externalId);
  return fromExternal || "unknown";
}

export function generateInstanceSlug(
  componentSlug: string,
  environment: string,
  externalId: string,
): string {
  const env = slugify(environment);
  const ext = slugify(externalId) || "default";
  return `${componentSlug}-${env}-${ext}`;
}
