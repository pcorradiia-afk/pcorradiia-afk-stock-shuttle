import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, DemoAuthProvider, useAuth } from "@/store/auth";
import { SUPABASE_READY } from "@/lib/supabase";
import { DEMO } from "@/lib/demo";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";
import { SetupGuide } from "@/pages/SetupGuide";
import { Login } from "@/pages/Login";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { Matches } from "@/pages/Matches";
import { Groups } from "@/pages/Groups";
import { Bracket } from "@/pages/Bracket";
import { Specials } from "@/pages/Specials";
import { Asados } from "@/pages/Asados";
import { Leaderboard } from "@/pages/Leaderboard";
import { Rules } from "@/pages/Rules";
import { Admin } from "@/pages/Admin";
import { Profile } from "@/pages/Profile";
import { NotFound } from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: true, staleTime: 30_000, retry: 1 },
  },
});

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6 text-center">
      {children}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SideNav />
      <main className="md:pl-64">
        <div className="max-w-4xl mx-auto pb-24 md:pb-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}

function Gate() {
  const { loading, session, profile } = useAuth();

  if (loading) {
    return (
      <FullScreen>
        <div className="animate-pulse text-muted-foreground">Cargando…</div>
      </FullScreen>
    );
  }
  if (!session) return <Login />;
  if (!profile) return <Onboarding />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/partidos" element={<Matches />} />
        <Route path="/grupos" element={<Groups />} />
        <Route path="/llaves" element={<Bracket />} />
        <Route path="/especiales" element={<Specials />} />
        <Route path="/asados" element={<Asados />} />
        <Route path="/tabla" element={<Leaderboard />} />
        <Route path="/reglas" element={<Rules />} />
        <Route path="/perfil" element={<Profile />} />
        <Route
          path="/admin"
          element={profile.is_admin ? <Admin /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Shell>
  );
}

const App = () => {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" richColors />
      <BrowserRouter basename={basename}>
        {DEMO ? (
          <DemoAuthProvider>
            <Gate />
          </DemoAuthProvider>
        ) : SUPABASE_READY ? (
          <AuthProvider>
            <Gate />
          </AuthProvider>
        ) : (
          <SetupGuide />
        )}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
