import { type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Download,
  Users,
  Settings,
  KeyRound,
  LogOut,
} from "lucide-react";
import { useSession, useLogout } from "@/api/hooks/auth";
import { cn } from "@/lib/utils";

interface NavLinkDef {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const LINKS: NavLinkDef[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/components", label: "Components", icon: Boxes },
  { to: "/importers", label: "Importers", icon: Download },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  { to: "/sessions", label: "Sessions", icon: KeyRound },
];

interface NavProps {
  children?: ReactNode;
}

/**
 * Top navigation bar. Renders the Componode brand, primary nav links (with
 * admin-only links gated by the current user's role), the signed-in user's
 * identity, and a sign-out button.
 *
 * WCAG 2.1 AA: the bar is a semantic <header>/<nav>, links expose
 * aria-current on the active route, icon-only affordances carry aria-labels,
 * and all controls are keyboard reachable as native elements.
 */
export function Nav({ children }: NavProps) {
  const { data: user, isLoading } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout.mutateAsync();
    } catch {
      /* still redirect even if the call fails */
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <header className="border-b bg-background">
      <nav className="px-6 py-3 flex items-center justify-between gap-4" aria-label="Main">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold"
            aria-label="Componode home"
          >
            <Boxes className="w-5 h-5" aria-hidden="true" />
            <span>Componode</span>
          </Link>
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => {
              if (link.adminOnly && user?.role !== "ADMIN") return null;
              const Icon = link.icon;
              return (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive && "bg-accent font-medium",
                      )
                    }
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="text-sm text-muted-foreground" aria-live="polite">
              Loading…
            </span>
          ) : user ? (
            <span className="text-sm text-muted-foreground">
              <span>{user.username}</span>
              <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs">{user.role}</span>
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </nav>
      {children}
    </header>
  );
}
