// Reglas del prode. Centralizadas para que la UI y el cálculo de puntos
// siempre usen los mismos números (y sea fácil de ajustar si el grupo cambia
// alguna regla antes del Mundial).

export const POINTS = {
  /** Acertar el ganador / empate (sin el marcador exacto). */
  outcome: 4,
  /** Acertar el marcador EXACTO. Reemplaza a `outcome` (no se suman). */
  exact: 6,
  /** Acertar el campeón del mundo. */
  champion: 40,
  /** Acertar el mejor jugador del Mundial. */
  bestPlayer: 10,
  /** Acertar el goleador del Mundial. */
  topScorer: 10,
  /** Por participar de un asado válido del grupo (mín. 4 comensales). */
  asadoAttendee: 5,
  /** Extra para quien pone la sede del asado. */
  asadoHost: 10,
} as const;

/** Mínimo de comensales del grupo para que un asado sume puntos. */
export const ASADO_MIN_GUESTS = 4;

/** Reparto del pozo. */
export const PRIZE_SPLIT = {
  first: 0.7,
  second: 0.3,
} as const;
