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
import { DocumentoDetalhePage } from "@/pages/DocumentoDetalhe";
import { AlertasPage } from "@/pages/Alertas";
import { RelatoriosPage } from "@/pages/Relatorios";
import { AdminPage } from "@/pages/Admin";

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

const documentoDetalheRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/documentos/$id",
  component: DocumentoDetalhePage,
});

const alertasRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/alertas",
  component: AlertasPage,
});

const relatoriosRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/relatorios",
  component: RelatoriosPage,
});

const adminRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authLayoutRoute.addChildren([
    dashboardRoute,
    documentosRoute,
    documentoNovoRoute,
    documentoDetalheRoute,
    alertasRoute,
    relatoriosRoute,
    adminRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
