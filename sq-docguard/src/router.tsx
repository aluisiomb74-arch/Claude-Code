import { useEffect } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Shell } from "@/components/Shell";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { DocumentosPage } from "@/pages/Documentos";
import { DocumentoNovoPage } from "@/pages/DocumentoNovo";

const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LoginPage,
});

/** Layout autenticado: bloqueia acesso sem sessão e envolve com a sidebar. */
function AuthLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/" });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Carregando...
      </div>
    );
  }
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_auth",
  component: AuthLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const documentosRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/documentos",
  component: DocumentosPage,
});

const documentoNovoRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/documentos/novo",
  component: DocumentoNovoPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authLayoutRoute.addChildren([dashboardRoute, documentosRoute, documentoNovoRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
