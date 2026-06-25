"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const { usuarioReal } = useSesion();

  useEffect(() => {
    router.replace(usuarioReal ? "/dashboard" : "/login");
  }, [usuarioReal, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Cargando…
    </div>
  );
}
