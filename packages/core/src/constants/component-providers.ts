export const COMPONENT_PROVIDERS = [
  "GITHUB",
  "AWS",
  "AZURE",
  "GOOGLE_CLOUD",
  "KUBERNETES",
  "DOCKER",
  "WEB",
  "API",
  "MCP",
  "OTHER",
] as const;

export type ComponentProvider = typeof COMPONENT_PROVIDERS[number];

export const COMPONENT_PROVIDER_META: Record<
  ComponentProvider,
  { label: string; description: string }
> = {
  GITHUB: {
    label: "GitHub",
    description: "Repositories discovered from GitHub",
  },
  AWS: {
    label: "AWS",
    description: "Cloud assets discovered from Amazon Web Services",
  },
  AZURE: {
    label: "Azure",
    description: "Cloud assets discovered from Microsoft Azure",
  },
  GOOGLE_CLOUD: {
    label: "Google Cloud",
    description: "Cloud assets discovered from Google Cloud Platform",
  },
  KUBERNETES: {
    label: "Kubernetes",
    description: "Workloads and namespaces discovered from a Kubernetes cluster",
  },
  DOCKER: {
    label: "Docker",
    description: "Containers and images discovered from a Docker host",
  },
  WEB: {
    label: "Web",
    description: "Endpoints discovered by probing a web URL",
  },
  API: {
    label: "API",
    description: "APIs discovered by probing an API URL (OpenAPI/health)",
  },
  MCP: {
    label: "MCP",
    description: "Tools and resources discovered from an MCP server",
  },
  OTHER: {
    label: "Other",
    description: "Component sourced from a provider not yet modeled",
  },
};
