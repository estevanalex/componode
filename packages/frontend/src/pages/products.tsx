import { Package } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";

export function ProductsPage() {
  return (
    <div className="bg-background p-6">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <EmptyState
        icon={Package}
        title="No products yet"
        description="Products will appear here after you create them."
      />
    </div>
  );
}
