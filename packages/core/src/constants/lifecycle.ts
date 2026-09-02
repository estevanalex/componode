export const COMPONENT_LIFECYCLE = ["ACTIVE", "RETIRED"] as const;

export type ComponentLifecycle = typeof COMPONENT_LIFECYCLE[number];

export const COMPONENT_LIFECYCLE_META: Record<
  ComponentLifecycle,
  { label: string; description: string }
> = {
  ACTIVE: {
    label: "Active",
    description: "Component is in scope and surfaced in default views",
  },
  RETIRED: {
    label: "Retired",
    description: "Component is out of scope and excluded from default views",
  },
};
