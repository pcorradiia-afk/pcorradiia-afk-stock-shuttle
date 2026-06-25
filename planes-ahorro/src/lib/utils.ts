import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un CUIT/DNI sin alterar lo que el usuario cargó (solo presentación básica). */
export function formatDocumento(valor: string | null | undefined) {
  if (!valor) return "—";
  return valor;
}
