import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useStorageSync, useGameState } from "@/store/game";
import { Welcome } from "@/pages/Welcome";
import { Home } from "@/pages/Home";
import { Album } from "@/pages/Album";
import { TeamDetail } from "@/pages/TeamDetail";
import { Play } from "@/pages/Play";
import { Profile } from "@/pages/Profile";
import { NotFound } from "@/pages/NotFound";
import { BottomNav } from "@/components/BottomNav";

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
  return (
    <BrowserRouter>
      <Sonner position="top-center" />
      <Routes>
        <Route path="/bienvenida" element={<Welcome />} />
        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/album" element={<Protected><Album /></Protected>} />
        <Route path="/album/:code" element={<Protected><TeamDetail /></Protected>} />
        <Route path="/jugar" element={<Protected><Play /></Protected>} />
        <Route path="/perfil" element={<Protected><Profile /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
