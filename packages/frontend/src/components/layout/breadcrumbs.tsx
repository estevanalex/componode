import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCrumbLabel } from "./crumb-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Static segment→label map per the route map in docs/ux.md §3. */
const SEGMENT_LABELS: Record<string, string> = {
  products: "Products",
  components: "Components",
  "component-groups": "Component Groups",
  importers: "Importers",
  runs: "Run",
  users: "Users",
  sessions: "Sessions",
  settings: "Settings",
};

function isUuid(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    segment,
  );
}

/**
 * Slug-based breadcrumbs derived from the current route. Detail segments
 * (UUIDs / slugs) render as the final page crumb; intermediate crumbs link to
 * their section root.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbLabel = useCrumbLabel();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ label: string; to?: string; mono?: boolean }> = [];

  segments.forEach((segment, i) => {
    const isLast = i === segments.length - 1;
    if (isUuid(segment)) {
      // Only the final crumb is meaningful; intermediate ids aren't navigable.
      if (isLast) {
        crumbs.push({ label: crumbLabel ?? segment, mono: crumbLabel == null });
      }
      return;
    }
    const label = SEGMENT_LABELS[segment] ?? segment;
    if (isLast) {
      crumbs.push({ label });
    } else {
      crumbs.push({ label, to: `/${segments.slice(0, i + 1).join("/")}` });
    }
  });

  // "runs" between configId and runId is not navigable — drop its link.
  const cleaned = crumbs.filter((c) => c.label !== "Run" || c.to === undefined);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {cleaned.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.to ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.to}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className={crumb.mono ? "font-mono text-xs" : undefined}>
                  {crumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
