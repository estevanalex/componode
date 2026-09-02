export interface ComponentGroup {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  teamOwnerId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}
