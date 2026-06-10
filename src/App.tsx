import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/auth/AuthContext";
import { PERMISOS } from "@/auth/permissions";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth, RequirePermiso } from "@/components/PermissionGate";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Rentabilidad } from "@/pages/Rentabilidad";
import { Comercial } from "@/pages/Comercial";
import { CuentasCorrientes } from "@/pages/CuentasCorrientes";
import { Auditoria } from "@/pages/Auditoria";
import { Importar } from "@/pages/Importar";
import { Empresas } from "@/pages/admin/Empresas";
import { Usuarios } from "@/pages/admin/Usuarios";
import { Roles } from "@/pages/admin/Roles";
import { NotFound } from "@/pages/NotFound";

const queryClient = new QueryClient();

/** Envuelve una página protegida en el layout, exigiendo un permiso. */
function Page({ permiso, children }: { permiso: string; children: React.ReactNode }) {
  return (
    <RequirePermiso permiso={permiso}>
      <AppShell>{children}</AppShell>
    </RequirePermiso>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <AppShell><Dashboard /></AppShell>
              </RequireAuth>
            }
          />
          <Route path="/rentabilidad" element={<Page permiso={PERMISOS.RENTABILIDAD_VER}><Rentabilidad /></Page>} />
          <Route path="/comercial" element={<Page permiso={PERMISOS.COMERCIAL_VER}><Comercial /></Page>} />
          <Route path="/cuentas-corrientes" element={<Page permiso={PERMISOS.CC_VER}><CuentasCorrientes /></Page>} />
          <Route path="/auditoria" element={<Page permiso={PERMISOS.AUDITORIA_VER}><Auditoria /></Page>} />
          <Route path="/importar" element={<Page permiso={PERMISOS.IMPORTAR_EJECUTAR}><Importar /></Page>} />
          <Route path="/admin/empresas" element={<Page permiso={PERMISOS.ADMIN_EMPRESAS}><Empresas /></Page>} />
          <Route path="/admin/usuarios" element={<Page permiso={PERMISOS.ADMIN_USUARIOS}><Usuarios /></Page>} />
          <Route path="/admin/roles" element={<Page permiso={PERMISOS.ADMIN_ROLES}><Roles /></Page>} />

          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
