import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProductTree } from "@/components/products/product-tree";
import type { DigitalProduct } from "@/api/types";

afterEach(cleanup);

/**
 * SC-001: the tree renders + expands a 1,000-product graph in <2s and a single
 * expand in <300ms.
 */
describe("ProductTree perf (SC-001)", () => {
  it("renders and expands a 1k-product graph within budget", () => {
    const products: DigitalProduct[] = [];
    const edges: { parentId: string; childId: string }[] = [];
    for (let i = 0; i < 1000; i++) {
      products.push({
        id: `p${i}`,
        name: `Product ${i}`,
        slug: `p${i}`,
        type: "BUSINESS_CAPABILITY",
        lifecycle: i % 50 === 49 ? "RETIRED" : "ACTIVE",
        createdAt: "",
        updatedAt: "",
      });
      if (i > 0) edges.push({ parentId: `p${i - 1}`, childId: `p${i}` });
    }

    const t0 = performance.now();
    render(
      <MemoryRouter>
        <ProductTree products={products} edges={edges} />
      </MemoryRouter>,
    );
    const renderMs = performance.now() - t0;

    const t1 = performance.now();
    fireEvent.click(screen.getAllByRole("button", { name: "Expand Product 0" })[0]!);
    const expandMs = performance.now() - t1;

    expect(renderMs).toBeLessThan(2000);
    expect(expandMs).toBeLessThan(300);
  });
});
