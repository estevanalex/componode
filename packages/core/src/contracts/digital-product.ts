import type { ProductType, ComponentLifecycle } from "../constants/index.js";

export interface DigitalProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  type: ProductType;
  lifecycle: ComponentLifecycle;
  lobOwnerId?: string | null;
  teamOwnerId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
