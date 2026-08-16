import { Link } from "react-router-dom";
import { Package, Boxes, Download, Settings, Users, KeyRound } from "lucide-react";

export function DashboardPage() {
  const navItems = [
    { label: "Products", href: "/products", icon: Package, description: "Digital products and their composition hierarchy" },
    { label: "Components", href: "/components", icon: Boxes, description: "Imported components from external sources" },
    { label: "Importers", href: "/importers", icon: Download, description: "Configure and run asset importers" },
    { label: "Users", href: "/users", icon: Users, description: "Manage users and their roles" },
    { label: "Settings", href: "/settings", icon: Settings, description: "Application settings and OIDC configuration" },
    { label: "Sessions", href: "/sessions", icon: KeyRound, description: "View and revoke active sessions" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Componode</h1>
          <form action="/api/v1/auth/logout" method="post">
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="p-6">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-muted-foreground mb-8">Welcome to Componode. Select a section below to get started.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="block p-6 border rounded-lg hover:border-primary hover:shadow-sm transition"
              >
                <Icon className="w-8 h-8 mb-3 text-muted-foreground" />
                <h3 className="font-semibold mb-1">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
