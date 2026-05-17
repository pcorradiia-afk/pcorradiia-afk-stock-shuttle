// Roster ficticio para cada equipo: 4 jugadores con apodos que evocan a
// figuras reales sin copiar sus nombres, y una "leyenda" para la figurita
// estrella. Los números intentan recordar las camisetas reales, pero todo es
// parodia con fines didácticos.

export type PlayerPosition = "Arquero" | "Defensor" | "Mediocampista" | "Goleador";

export interface PlayerRoster {
  nickname: string;
  position: PlayerPosition;
  number: number;
}

export interface TeamRoster {
  players: PlayerRoster[]; // exactly 4
  legend: string;
}

export const TEAM_ROSTERS: Record<string, TeamRoster> = {
  // ---------- CONCACAF (anfitriones) ----------
  MEX: {
    players: [
      { nickname: "Memo Atajón", position: "Arquero", number: 1 },
      { nickname: "Edsoncito", position: "Mediocampista", number: 4 },
      { nickname: "Chukito", position: "Mediocampista", number: 22 },
      { nickname: "Santi Bebeto", position: "Goleador", number: 11 },
    ],
    legend: "Hugol del Pentagol",
  },
  USA: {
    players: [
      { nickname: "Maty Manos", position: "Arquero", number: 1 },
      { nickname: "Tylo Patrón", position: "Mediocampista", number: 4 },
      { nickname: "Wesi Crack", position: "Mediocampista", number: 8 },
      { nickname: "Capi Pulisí", position: "Goleador", number: 10 },
    ],
    legend: "Landó el Capitán",
  },
  CAN: {
    players: [
      { nickname: "Mil Manos", position: "Arquero", number: 1 },
      { nickname: "Big Larín", position: "Defensor", number: 17 },
      { nickname: "Davies Cohete", position: "Mediocampista", number: 19 },
      { nickname: "Jonny Goles", position: "Goleador", number: 20 },
    ],
    legend: "De Rosarito",
  },

  // ---------- CONMEBOL ----------
  ARG: {
    players: [
      { nickname: "Dibu el Dragón", position: "Arquero", number: 23 },
      { nickname: "Cuti Tanque", position: "Defensor", number: 13 },
      { nickname: "La Arañita", position: "Mediocampista", number: 22 },
      { nickname: "Lío Pulgüez", position: "Goleador", number: 10 },
    ],
    legend: "El Diego del Cielo",
  },
  BRA: {
    players: [
      { nickname: "Eddy Manopla", position: "Arquero", number: 1 },
      { nickname: "Marqui Muralla", position: "Defensor", number: 4 },
      { nickname: "Rafa Magia", position: "Mediocampista", number: 11 },
      { nickname: "Viní Chispa", position: "Goleador", number: 7 },
    ],
    legend: "O Rei Pelete",
  },
  URU: {
    players: [
      { nickname: "Sergi Manos", position: "Arquero", number: 1 },
      { nickname: "Gimi Muralla", position: "Defensor", number: 2 },
      { nickname: "Valverdín", position: "Mediocampista", number: 15 },
      { nickname: "Darwí Cañón", position: "Goleador", number: 9 },
    ],
    legend: "El Maestro Forli",
  },
  COL: {
    players: [
      { nickname: "Ospi Manos", position: "Arquero", number: 1 },
      { nickname: "Yerry Muralla", position: "Defensor", number: 3 },
      { nickname: "Jamesí Magia", position: "Mediocampista", number: 10 },
      { nickname: "Luchín Veloz", position: "Goleador", number: 7 },
    ],
    legend: "El Pibe Crespito",
  },
  ECU: {
    players: [
      { nickname: "Domi Manos", position: "Arquero", number: 22 },
      { nickname: "Pacho Muralla", position: "Defensor", number: 3 },
      { nickname: "Caicedito", position: "Mediocampista", number: 5 },
      { nickname: "Enner Cañón", position: "Goleador", number: 13 },
    ],
    legend: "Antonio el Tren",
  },
  PAR: {
    players: [
      { nickname: "Gatito Manos", position: "Arquero", number: 1 },
      { nickname: "Roque Capi", position: "Defensor", number: 2 },
      { nickname: "Sanaí Crack", position: "Mediocampista", number: 19 },
      { nickname: "Almi Cañón", position: "Goleador", number: 11 },
    ],
    legend: "Chila el Arquero Goleador",
  },
  VEN: {
    players: [
      { nickname: "Wuilki Manos", position: "Arquero", number: 1 },
      { nickname: "Yangi Patrón", position: "Mediocampista", number: 8 },
      { nickname: "Sotí Veloz", position: "Mediocampista", number: 11 },
      { nickname: "Sal Cañón", position: "Goleador", number: 9 },
    ],
    legend: "El Mago Arenguito",
  },
  BOL: {
    players: [
      { nickname: "Lampi Manos", position: "Arquero", number: 1 },
      { nickname: "Bejarí Muralla", position: "Defensor", number: 2 },
      { nickname: "Vaquita Crack", position: "Mediocampista", number: 10 },
      { nickname: "Marcito Tanque", position: "Goleador", number: 17 },
    ],
    legend: "El Diablo Etcheverrita",
  },

  // ---------- UEFA ----------
  ESP: {
    players: [
      { nickname: "Unaí Atajón", position: "Arquero", number: 1 },
      { nickname: "Rodri Patrón", position: "Mediocampista", number: 16 },
      { nickname: "Pedro Magia", position: "Mediocampista", number: 8 },
      { nickname: "Lami Yamí", position: "Goleador", number: 19 },
    ],
    legend: "Andresito el Iniciador",
  },
  FRA: {
    players: [
      { nickname: "Mike Manos", position: "Arquero", number: 16 },
      { nickname: "Brasi Muralla", position: "Defensor", number: 4 },
      { nickname: "Antu Magia", position: "Mediocampista", number: 7 },
      { nickname: "K. Veloz", position: "Goleador", number: 10 },
    ],
    legend: "Zizú el Maestro",
  },
  ENG: {
    players: [
      { nickname: "Picky Manos", position: "Arquero", number: 1 },
      { nickname: "Foden Crack", position: "Mediocampista", number: 11 },
      { nickname: "Bellí Capi", position: "Mediocampista", number: 10 },
      { nickname: "Harry Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Sir Bobby de Mancha",
  },
  GER: {
    players: [
      { nickname: "Manu Manos", position: "Arquero", number: 1 },
      { nickname: "Anto Muralla", position: "Defensor", number: 5 },
      { nickname: "Müsiala", position: "Mediocampista", number: 10 },
      { nickname: "Kai Bávaro", position: "Goleador", number: 7 },
    ],
    legend: "Káiser Franzi",
  },
  ITA: {
    players: [
      { nickname: "Donna Manos", position: "Arquero", number: 21 },
      { nickname: "Bastoní Muralla", position: "Defensor", number: 23 },
      { nickname: "Locatí Patrón", position: "Mediocampista", number: 5 },
      { nickname: "Chiesetta", position: "Goleador", number: 14 },
    ],
    legend: "Il Pibe Tottini",
  },
  POR: {
    players: [
      { nickname: "Diogo Manos", position: "Arquero", number: 1 },
      { nickname: "Rúben Muralla", position: "Defensor", number: 3 },
      { nickname: "Bernardín", position: "Mediocampista", number: 10 },
      { nickname: "El Bicho 7", position: "Goleador", number: 7 },
    ],
    legend: "Eusebín el Pantera",
  },
  NED: {
    players: [
      { nickname: "Verbri Manos", position: "Arquero", number: 1 },
      { nickname: "Van Diké Muralla", position: "Defensor", number: 4 },
      { nickname: "De Yong Magia", position: "Mediocampista", number: 21 },
      { nickname: "Gakpín Veloz", position: "Goleador", number: 11 },
    ],
    legend: "Johanito Cruyñete",
  },
  BEL: {
    players: [
      { nickname: "Casti Manos", position: "Arquero", number: 1 },
      { nickname: "Vertongo Capi", position: "Defensor", number: 5 },
      { nickname: "Kev De Magia", position: "Mediocampista", number: 7 },
      { nickname: "Lukafú", position: "Goleador", number: 9 },
    ],
    legend: "Edín Hazardito",
  },
  CRO: {
    players: [
      { nickname: "Livi Manos", position: "Arquero", number: 1 },
      { nickname: "Gvardín Muralla", position: "Defensor", number: 5 },
      { nickname: "Kova Crack", position: "Mediocampista", number: 8 },
      { nickname: "Modri Capi", position: "Mediocampista", number: 10 },
    ],
    legend: "Davorín de Oro",
  },
  SUI: {
    players: [
      { nickname: "Sommé Manos", position: "Arquero", number: 1 },
      { nickname: "Akan Muralla", position: "Defensor", number: 5 },
      { nickname: "Chaka Capi", position: "Mediocampista", number: 10 },
      { nickname: "Embo Veloz", position: "Goleador", number: 7 },
    ],
    legend: "Stefan el Chapu",
  },
  DEN: {
    players: [
      { nickname: "Schmechi", position: "Arquero", number: 1 },
      { nickname: "Andi Muralla", position: "Defensor", number: 4 },
      { nickname: "Eriksín", position: "Mediocampista", number: 10 },
      { nickname: "Hojo Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Lauri el Rey",
  },
  POL: {
    players: [
      { nickname: "Szczes Manos", position: "Arquero", number: 1 },
      { nickname: "Beresí Muralla", position: "Defensor", number: 15 },
      { nickname: "Zieli Magia", position: "Mediocampista", number: 20 },
      { nickname: "Lewy Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Lato el Cohete",
  },
  AUT: {
    players: [
      { nickname: "Pentz Manos", position: "Arquero", number: 1 },
      { nickname: "Alabón Capi", position: "Defensor", number: 8 },
      { nickname: "Sabi Crack", position: "Mediocampista", number: 10 },
      { nickname: "Arnau Tanque", position: "Goleador", number: 7 },
    ],
    legend: "Hans el Krankazo",
  },
  NOR: {
    players: [
      { nickname: "Nyland Manos", position: "Arquero", number: 1 },
      { nickname: "Aju Muralla", position: "Defensor", number: 5 },
      { nickname: "Ode Magia", position: "Mediocampista", number: 8 },
      { nickname: "Erlín Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Olé el Solskito",
  },
  SCO: {
    players: [
      { nickname: "Gunn Manos", position: "Arquero", number: 1 },
      { nickname: "Robbi Capi", position: "Defensor", number: 3 },
      { nickname: "Gilmú Magia", position: "Mediocampista", number: 15 },
      { nickname: "McTomi Cañón", position: "Goleador", number: 4 },
    ],
    legend: "Sir Kennie de Glasgow",
  },
  TUR: {
    players: [
      { nickname: "Çakir Manos", position: "Arquero", number: 1 },
      { nickname: "Demi Muralla", position: "Defensor", number: 4 },
      { nickname: "Arda Magia", position: "Mediocampista", number: 10 },
      { nickname: "Çali Cañón", position: "Goleador", number: 11 },
    ],
    legend: "Hakán el Toro",
  },
  WAL: {
    players: [
      { nickname: "Ben Manos", position: "Arquero", number: 1 },
      { nickname: "Nico Crack", position: "Defensor", number: 14 },
      { nickname: "Ramsí Magia", position: "Mediocampista", number: 10 },
      { nickname: "Bale Rey", position: "Goleador", number: 11 },
    ],
    legend: "Big John el Galés",
  },

  // ---------- CAF ----------
  MAR: {
    players: [
      { nickname: "Bonó Manos", position: "Arquero", number: 1 },
      { nickname: "Hakimito", position: "Defensor", number: 2 },
      { nickname: "Ziyé Magia", position: "Mediocampista", number: 7 },
      { nickname: "En Nesí Cañón", position: "Goleador", number: 19 },
    ],
    legend: "Mago Hadjito",
  },
  SEN: {
    players: [
      { nickname: "Mendý Manos", position: "Arquero", number: 16 },
      { nickname: "Kuli Muralla", position: "Defensor", number: 3 },
      { nickname: "Sarrí Veloz", position: "Mediocampista", number: 17 },
      { nickname: "Sadi Cañón", position: "Goleador", number: 10 },
    ],
    legend: "El Tío Diufito",
  },
  TUN: {
    players: [
      { nickname: "Hassen Manos", position: "Arquero", number: 16 },
      { nickname: "Maluli Muralla", position: "Defensor", number: 5 },
      { nickname: "Khazi Magia", position: "Mediocampista", number: 10 },
      { nickname: "Slití Veloz", position: "Goleador", number: 11 },
    ],
    legend: "Hatem el Trabazo",
  },
  EGY: {
    players: [
      { nickname: "El Shená Manos", position: "Arquero", number: 1 },
      { nickname: "Hegaz Muralla", position: "Defensor", number: 6 },
      { nickname: "Trezí Crack", position: "Mediocampista", number: 7 },
      { nickname: "Mo Salí", position: "Goleador", number: 10 },
    ],
    legend: "El Faraón Aboutriki",
  },
  ALG: {
    players: [
      { nickname: "M'Boli Manos", position: "Arquero", number: 16 },
      { nickname: "Mandí Muralla", position: "Defensor", number: 2 },
      { nickname: "Mahrezí", position: "Mediocampista", number: 7 },
      { nickname: "Bena Cañón", position: "Goleador", number: 11 },
    ],
    legend: "Madji el Talón",
  },
  NGA: {
    players: [
      { nickname: "Uzo Manos", position: "Arquero", number: 23 },
      { nickname: "Ekonki Muralla", position: "Defensor", number: 5 },
      { nickname: "Iwobí Crack", position: "Mediocampista", number: 18 },
      { nickname: "Osi Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Kanú el Príncipe",
  },
  GHA: {
    players: [
      { nickname: "Ati Manos", position: "Arquero", number: 16 },
      { nickname: "Salisí Muralla", position: "Defensor", number: 4 },
      { nickname: "Andre Capi", position: "Mediocampista", number: 10 },
      { nickname: "Iñaki Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Abedí el Pelé",
  },
  CIV: {
    players: [
      { nickname: "Sangaré Manos", position: "Arquero", number: 1 },
      { nickname: "Kossou Muralla", position: "Defensor", number: 4 },
      { nickname: "Pépito Magia", position: "Mediocampista", number: 19 },
      { nickname: "Hallí Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Didí Drogón",
  },
  RSA: {
    players: [
      { nickname: "Wíllí Manos", position: "Arquero", number: 16 },
      { nickname: "Foster Muralla", position: "Defensor", number: 3 },
      { nickname: "Mokoé Patrón", position: "Mediocampista", number: 8 },
      { nickname: "Zwa Veloz", position: "Goleador", number: 11 },
    ],
    legend: "Doctor Khumalito",
  },

  // ---------- AFC ----------
  JPN: {
    players: [
      { nickname: "Gondó Manos", position: "Arquero", number: 12 },
      { nickname: "Itakú Muralla", position: "Defensor", number: 4 },
      { nickname: "Endo Patrón", position: "Mediocampista", number: 6 },
      { nickname: "Mitomá", position: "Goleador", number: 9 },
    ],
    legend: "Honda Rey",
  },
  KOR: {
    players: [
      { nickname: "Jo Manos", position: "Arquero", number: 1 },
      { nickname: "Kim Mín Muralla", position: "Defensor", number: 19 },
      { nickname: "Leecito Magia", position: "Mediocampista", number: 18 },
      { nickname: "Soní 7", position: "Goleador", number: 7 },
    ],
    legend: "Parki el Tres Pulmones",
  },
  IRN: {
    players: [
      { nickname: "Beiri Manos", position: "Arquero", number: 1 },
      { nickname: "Cheshmí Muralla", position: "Defensor", number: 23 },
      { nickname: "Jaha Magia", position: "Mediocampista", number: 7 },
      { nickname: "Taremí Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Ali Daí Rey",
  },
  KSA: {
    players: [
      { nickname: "Owís Manos", position: "Arquero", number: 21 },
      { nickname: "Yass Capi", position: "Defensor", number: 3 },
      { nickname: "Firaz Crack", position: "Mediocampista", number: 19 },
      { nickname: "Salem Cañón", position: "Goleador", number: 10 },
    ],
    legend: "Sami el Jaber",
  },
  AUS: {
    players: [
      { nickname: "Ryan Manos", position: "Arquero", number: 1 },
      { nickname: "Sou Muralla", position: "Defensor", number: 19 },
      { nickname: "Mooy Magia", position: "Mediocampista", number: 13 },
      { nickname: "Duke Cañón", position: "Goleador", number: 15 },
    ],
    legend: "Tim Caí el Rey",
  },
  QAT: {
    players: [
      { nickname: "Saad Manos", position: "Arquero", number: 1 },
      { nickname: "Pedrí Muralla", position: "Defensor", number: 2 },
      { nickname: "Akram Veloz", position: "Mediocampista", number: 11 },
      { nickname: "Almoezí", position: "Goleador", number: 19 },
    ],
    legend: "Khalfán el Mago",
  },
  IRQ: {
    players: [
      { nickname: "Tala Manos", position: "Arquero", number: 1 },
      { nickname: "Hadí Muralla", position: "Defensor", number: 4 },
      { nickname: "Bayes Magia", position: "Mediocampista", number: 10 },
      { nickname: "Aymán Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Yúnis el Rey",
  },
  UZB: {
    players: [
      { nickname: "Yusu Manos", position: "Arquero", number: 1 },
      { nickname: "Khusan Muralla", position: "Defensor", number: 4 },
      { nickname: "Masha Magia", position: "Mediocampista", number: 10 },
      { nickname: "Shomy Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Maxim el Shati",
  },

  // ---------- CONCACAF (más) ----------
  CRC: {
    players: [
      { nickname: "Keylí Manos", position: "Arquero", number: 1 },
      { nickname: "Calvi Patrón", position: "Defensor", number: 5 },
      { nickname: "Bryan Crack", position: "Mediocampista", number: 10 },
      { nickname: "Joel Veloz", position: "Goleador", number: 12 },
    ],
    legend: "Paolo Wancho el Tico",
  },
  PAN: {
    players: [
      { nickname: "Pene Manos", position: "Arquero", number: 1 },
      { nickname: "Murillo Muralla", position: "Defensor", number: 6 },
      { nickname: "Quinte Magia", position: "Mediocampista", number: 10 },
      { nickname: "Toro Tejada", position: "Goleador", number: 9 },
    ],
    legend: "Capi Baloyín",
  },
  JAM: {
    players: [
      { nickname: "Blakí Manos", position: "Arquero", number: 1 },
      { nickname: "Lowí Muralla", position: "Defensor", number: 3 },
      { nickname: "Bailí Veloz", position: "Mediocampista", number: 7 },
      { nickname: "Antoní Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Whitmí el Reggae",
  },

  // ---------- OFC ----------
  NZL: {
    players: [
      { nickname: "Sigi Manos", position: "Arquero", number: 1 },
      { nickname: "Boxí Muralla", position: "Defensor", number: 6 },
      { nickname: "Stamén Magia", position: "Mediocampista", number: 10 },
      { nickname: "Wudi Cañón", position: "Goleador", number: 9 },
    ],
    legend: "Ricki el Kiwi",
  },
};

const GENERIC_ROSTER: TeamRoster = {
  players: [
    { nickname: "El Atajón", position: "Arquero", number: 1 },
    { nickname: "El Muro", position: "Defensor", number: 4 },
    { nickname: "La Magia", position: "Mediocampista", number: 10 },
    { nickname: "El Cañón", position: "Goleador", number: 9 },
  ],
  legend: "La Leyenda",
};

export function getTeamRoster(code: string): TeamRoster {
  return TEAM_ROSTERS[code] ?? GENERIC_ROSTER;
}
