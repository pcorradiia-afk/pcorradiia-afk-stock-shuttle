import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH || "/",
  server: {
    host: "::",
    port: 8080,
    // Permite el acceso desde el reenvío de puertos / preview del entorno
    // remoto, que entra por un hostname generado (no localhost). Solo afecta
    // al servidor de desarrollo.
    allowedHosts: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa las librerías pesadas en paquetes propios: la primera carga
        // baja y el navegador cachea los vendors entre deploys.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          excel: ["xlsx"],
          supabase: ["@supabase/supabase-js"],
        },
      },
    },
  },
}));
