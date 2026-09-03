import { type RouteObject } from "react-router-dom";
import { AuthGuard } from "@/components/layout/auth-guard";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { OidcCallbackPage } from "@/pages/oidc-callback";
import { DashboardPage } from "@/pages/dashboard";
import { ProductsPage } from "@/pages/products";
import { ComponentsPage } from "@/pages/components";
import { ImportersPage } from "@/pages/importers";
import { ImporterRunPage } from "@/pages/importer-run";
import { UsersPage } from "@/pages/users";
import { SettingsPage } from "@/pages/settings";
import { SessionsPage } from "@/pages/sessions";
import { NotFoundPage } from "@/pages/not-found";

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/auth/oidc/callback", element: <OidcCallbackPage /> },
  {
    path: "/",
    element: (
      <AuthGuard>
        <DashboardPage />
      </AuthGuard>
    ),
  },
  {
    path: "/products",
    element: (
      <AuthGuard>
        <ProductsPage />
      </AuthGuard>
    ),
  },
  {
    path: "/components",
    element: (
      <AuthGuard>
        <ComponentsPage />
      </AuthGuard>
    ),
  },
  {
    path: "/importers",
    element: (
      <AuthGuard>
        <ImportersPage />
      </AuthGuard>
    ),
  },
  {
    path: "/importers/:configId/runs/:runId",
    element: (
      <AuthGuard>
        <ImporterRunPage />
      </AuthGuard>
    ),
  },
  {
    path: "/users",
    element: (
      <AuthGuard requiredRole="ADMIN">
        <UsersPage />
      </AuthGuard>
    ),
  },
  {
    path: "/settings",
    element: (
      <AuthGuard requiredRole="ADMIN">
        <SettingsPage />
      </AuthGuard>
    ),
  },
  {
    path: "/sessions",
    element: (
      <AuthGuard>
        <SessionsPage />
      </AuthGuard>
    ),
  },
  { path: "*", element: <NotFoundPage /> },
];
