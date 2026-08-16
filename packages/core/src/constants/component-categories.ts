export const COMPONENT_CATEGORIES = [
  "COMPUTE",
  "STORAGE",
  "NETWORK",
  "DATABASE",
  "MESSAGE_QUEUE",
  "CACHE",
  "CDN",
  "LOAD_BALANCER",
  "API_GATEWAY",
  "CONTAINER",
  "CONTAINER_ORCHESTRATION",
  "SERVERLESS_FUNCTION",
  "STATIC_SITE",
  "WEB_APP",
  "MOBILE_APP",
  "DESKTOP_APP",
  "CLI_TOOL",
  "SDK_LIBRARY",
  "DATA_PIPELINE",
  "ETL_JOB",
  "ANALYTICS_SERVICE",
  "MONITORING_SERVICE",
  "IDENTITY_PROVIDER",
  "OTHER",
] as const;

export type ComponentCategory = typeof COMPONENT_CATEGORIES[number];

export const COMPONENT_CATEGORY_META: Record<
  ComponentCategory,
  { label: string; description: string }
> = {
  COMPUTE: {
    label: "Compute",
    description: "Virtual machines, bare-metal hosts, and general compute resources",
  },
  STORAGE: {
    label: "Storage",
    description: "Object, block, and file storage services",
  },
  NETWORK: {
    label: "Network",
    description: "Virtual networks, subnets, routing, and connectivity",
  },
  DATABASE: {
    label: "Database",
    description: "Managed relational, document, and other datastore services",
  },
  MESSAGE_QUEUE: {
    label: "Message Queue",
    description: "Brokers and queues for asynchronous messaging",
  },
  CACHE: {
    label: "Cache",
    description: "In-memory caching services",
  },
  CDN: {
    label: "CDN",
    description: "Content delivery networks and edge distribution",
  },
  LOAD_BALANCER: {
    label: "Load Balancer",
    description: "Traffic distribution across multiple targets",
  },
  API_GATEWAY: {
    label: "API Gateway",
    description: "Managed API routing, throttling, and composition",
  },
  CONTAINER: {
    label: "Container",
    description: "Individual container workloads (e.g. a running container image)",
  },
  CONTAINER_ORCHESTRATION: {
    label: "Container Orchestration",
    description: "Orchestrated workload resources (e.g. Kubernetes Deployments, ReplicaSets)",
  },
  SERVERLESS_FUNCTION: {
    label: "Serverless Function",
    description: "Function-as-a-service compute invoked on demand",
  },
  STATIC_SITE: {
    label: "Static Site",
    description: "Static asset hosting served directly to browsers",
  },
  WEB_APP: {
    label: "Web App",
    description: "Server-rendered or hybrid browser applications",
  },
  MOBILE_APP: {
    label: "Mobile App",
    description: "Native or cross-platform mobile applications",
  },
  DESKTOP_APP: {
    label: "Desktop App",
    description: "Native desktop applications",
  },
  CLI_TOOL: {
    label: "CLI Tool",
    description: "Command-line tools distributed to users or CI",
  },
  SDK_LIBRARY: {
    label: "SDK / Library",
    description: "Published libraries and SDKs consumed by other code",
  },
  DATA_PIPELINE: {
    label: "Data Pipeline",
    description: "Stream or batch processing pipelines",
  },
  ETL_JOB: {
    label: "ETL Job",
    description: "Scheduled extract-transform-load jobs",
  },
  ANALYTICS_SERVICE: {
    label: "Analytics Service",
    description: "Reporting, BI, and analytics services",
  },
  MONITORING_SERVICE: {
    label: "Monitoring Service",
    description: "Observability, metrics, and alerting services",
  },
  IDENTITY_PROVIDER: {
    label: "Identity Provider",
    description: "Authentication and identity services (e.g. OIDC, SAML providers)",
  },
  OTHER: {
    label: "Other",
    description: "Component that does not fit any other category",
  },
};
