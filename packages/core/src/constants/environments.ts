export const ENVIRONMENTS = [
  "DEV",
  "TEST",
  "STAGING",
  "DEMO",
  "PRODUCTION",
  "OTHER",
] as const;

export type Environment = typeof ENVIRONMENTS[number];

export const ENVIRONMENT_META: Record<
  Environment,
  { label: string; description: string }
> = {
  DEV: {
    label: "Development",
    description: "Developer-facing environment for active iteration",
  },
  TEST: {
    label: "Test",
    description: "Automated test execution environment",
  },
  STAGING: {
    label: "Staging",
    description: "Pre-production environment mirroring production",
  },
  DEMO: {
    label: "Demo",
    description: "Demonstration environment for previews and training",
  },
  PRODUCTION: {
    label: "Production",
    description: "Live environment serving real users",
  },
  OTHER: {
    label: "Other",
    description: "Environment that does not fit a standard category",
  },
};
