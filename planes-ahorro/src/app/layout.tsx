import type { Metadata } from "next";
import "./globals.css";
import { SesionProvider } from "@/lib/session";

export const metadata: Metadata = {
  title: "Planes de Ahorro · Grupo Fiorasi",
  description: "Gestión y seguimiento de planes de ahorro — Grupo Fiorasi: Pedro Corradi y SAPAC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>
        <SesionProvider>{children}</SesionProvider>
      </body>
    </html>
  );
}
