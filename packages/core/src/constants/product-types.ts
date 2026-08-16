export const PRODUCT_TYPES = [
  "BUSINESS_CAPABILITY",
  "PLATFORM",
  "CUSTOMER_FACING",
] as const;

export type ProductType = typeof PRODUCT_TYPES[number];

export const PRODUCT_TYPE_META: Record<
  ProductType,
  { label: string; description: string }
> = {
  BUSINESS_CAPABILITY: {
    label: "Business Capability",
    description: "Product representing a line-of-business capability that composes shared platforms",
  },
  PLATFORM: {
    label: "Platform",
    description: "Shared platform product consumed by business capabilities",
  },
  CUSTOMER_FACING: {
    label: "Customer-Facing",
    description: "Product delivered directly to external customers",
  },
};
