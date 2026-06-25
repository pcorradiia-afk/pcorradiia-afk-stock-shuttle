import type { Metadata } from "next";
import "./globals.css";
import { SesionProvider } from "@/lib/session";

export const metadata: Metadata = {
  title: "Planes de Ahorro · Grupo Corradi",
  description: "Gestión y seguimiento de planes de ahorro — Pedro Corradi y SAPAC (Fiorasi).",
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
