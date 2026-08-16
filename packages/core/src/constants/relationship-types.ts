export const RELATIONSHIP_TYPES = [
  "COMPOSES",
  "CONSUMES_FROM",
  "DEPENDS_ON",
  "SOURCES_FROM",
  "EXPOSES",
  "HAS_INSTANCE",
  "OWNS",
  "BELONGS_TO",
] as const;

export type RelationshipType = typeof RELATIONSHIP_TYPES[number];

export const RELATIONSHIP_TYPE_META: Record<
  RelationshipType,
  { label: string; description: string }
> = {
  COMPOSES: {
    label: "Composes",
    description: "Parent product composes a child product into a hierarchy",
  },
  CONSUMES_FROM: {
    label: "Consumes From",
    description: "Consumer product consumes from a shared platform product",
  },
  DEPENDS_ON: {
    label: "Depends On",
    description: "Product or component depends on another component",
  },
  SOURCES_FROM: {
    label: "Sources From",
    description: "Component sources its code from a repository",
  },
  EXPOSES: {
    label: "Exposes",
    description: "Component exposes an API component",
  },
  HAS_INSTANCE: {
    label: "Has Instance",
    description: "Component has an environment-specific instance",
  },
  OWNS: {
    label: "Owns",
    description: "Line of business or team owns a product or component",
  },
  BELONGS_TO: {
    label: "Belongs To",
    description: "Person belongs to a team",
  },
};
