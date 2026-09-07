import { Link, useLocation } from "react-router-dom";

const SECTIONS = [
  "products",
  "components",
  "component-groups",
  "importers",
  "users",
  "sessions",
  "settings",
];

/** Dedicated 404 state per docs/ux.md §6 — links back to the section root. */
export function NotFoundPage() {
  const { pathname } = useLocation();
  const first = pathname.split("/").filter(Boolean)[0];
  const section = first && SECTIONS.includes(first) ? `/${first}` : "/";

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <p className="mb-4 text-muted-foreground">Page not found</p>
        <Link to={section} className="text-primary hover:underline">
          {section === "/" ? "Go to dashboard" : "Back to section"}
        </Link>
      </div>
    </div>
  );
}
