import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner, toast } from "sonner";
import { useGameState, useSessionTicker, useStorageSync } from "@/store/game";
import { Welcome } from "@/pages/Welcome";
import { Home } from "@/pages/Home";
import { Album } from "@/pages/Album";
import { TeamDetail } from "@/pages/TeamDetail";
import { Play } from "@/pages/Play";
import { Profile } from "@/pages/Profile";
import { NotFound } from "@/pages/NotFound";
import { BottomNav } from "@/components/BottomNav";
import { SessionGate } from "@/components/SessionGate";

function Protected({ children }: { children: React.ReactNode }) {
  const game = useGameState();
  if (!game.activePlayer) return <Navigate to="/bienvenida" replace />;
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

const App = () => {
  useStorageSync();
  useSessionTicker({
    onWarn5: () =>
      toast("⏰ Quedan 5 minutos del partido", {
        description: "Después toca un descanso de 20 minutos.",
        duration: 5000,
      }),
    onWarn1: () =>
      toast("⏰ ¡Último minuto del partido!", {
        description: "Apurate a meter el último golazo.",
        duration: 5000,
      }),
    onRestStart: () =>
      toast("⏸️ ¡Medio tiempo!", {
        description: "Hora de descansar 20 minutos.",
        duration: 6000,
      }),
  });
  return (
    <BrowserRouter>
      <Sonner position="top-center" />
      <Routes>
        <Route path="/bienvenida" element={<Welcome />} />
        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/album" element={<Protected><Album /></Protected>} />
        <Route path="/album/:code" element={<Protected><TeamDetail /></Protected>} />
        <Route
          path="/jugar"
          element={
            <Protected>
              <SessionGate>
                <Play />
              </SessionGate>
            </Protected>
          }
        />
        <Route path="/perfil" element={<Protected><Profile /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
