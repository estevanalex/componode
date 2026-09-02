import type { AnchorHTMLAttributes } from "react";

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

/**
 * External link component with rel="noopener noreferrer" (ADR-085).
 * Prevents tab-nabbing attacks when opening links in new tabs.
 * Extra anchor props (id, aria-label, etc.) are passed through.
 */
export function ExternalLink({ href, children, className, ...rest }: ExternalLinkProps) {
  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
