export type Confederation = "CONMEBOL" | "UEFA" | "CONCACAF" | "CAF" | "AFC" | "OFC";

export interface Team {
  code: string;
  name: string;
  capital: string;
  language: string;
  confederation: Confederation;
  flag: string;
  color: string;
  funFact: string;
}

export const TEAMS: Team[] = [
  // Anfitriones (CONCACAF)
  { code: "MEX", name: "México", capital: "Ciudad de México", language: "Español", confederation: "CONCACAF", flag: "🇲🇽", color: "#006847", funFact: "Es uno de los tres países anfitriones del Mundial 2026." },
  { code: "USA", name: "Estados Unidos", capital: "Washington D.C.", language: "Inglés", confederation: "CONCACAF", flag: "🇺🇸", color: "#3C3B6E", funFact: "Tiene 50 estados y es anfitrión del Mundial 2026." },
  { code: "CAN", name: "Canadá", capital: "Ottawa", language: "Inglés y Francés", confederation: "CONCACAF", flag: "🇨🇦", color: "#D52B1E", funFact: "Su símbolo es la hoja de arce." },

  // CONMEBOL
  { code: "ARG", name: "Argentina", capital: "Buenos Aires", language: "Español", confederation: "CONMEBOL", flag: "🇦🇷", color: "#75AADB", funFact: "¡Campeona del mundo en Qatar 2022!" },
  { code: "BRA", name: "Brasil", capital: "Brasilia", language: "Portugués", confederation: "CONMEBOL", flag: "🇧🇷", color: "#009C3B", funFact: "Es el país con más mundiales ganados: 5." },
  { code: "URU", name: "Uruguay", capital: "Montevideo", language: "Español", confederation: "CONMEBOL", flag: "🇺🇾", color: "#7BAFD4", funFact: "Es limítrofe con Argentina y ganó el primer mundial en 1930." },
  { code: "COL", name: "Colombia", capital: "Bogotá", language: "Español", confederation: "CONMEBOL", flag: "🇨🇴", color: "#FFCD00", funFact: "Es el país con más mariposas del mundo." },
  { code: "ECU", name: "Ecuador", capital: "Quito", language: "Español", confederation: "CONMEBOL", flag: "🇪🇨", color: "#FFD100", funFact: "Está en la línea del Ecuador, por eso su nombre." },
  { code: "PAR", name: "Paraguay", capital: "Asunción", language: "Español y Guaraní", confederation: "CONMEBOL", flag: "🇵🇾", color: "#D52B1E", funFact: "Es limítrofe con Argentina." },
  { code: "VEN", name: "Venezuela", capital: "Caracas", language: "Español", confederation: "CONMEBOL", flag: "🇻🇪", color: "#FFCC00", funFact: "Tiene el salto de agua más alto: el Salto Ángel." },
  { code: "BOL", name: "Bolivia", capital: "La Paz / Sucre", language: "Español", confederation: "CONMEBOL", flag: "🇧🇴", color: "#007934", funFact: "Es limítrofe con Argentina y tiene el lago navegable más alto: el Titicaca." },

  // UEFA
  { code: "ESP", name: "España", capital: "Madrid", language: "Español", confederation: "UEFA", flag: "🇪🇸", color: "#AA151B", funFact: "Su selección se llama La Roja." },
  { code: "FRA", name: "Francia", capital: "París", language: "Francés", confederation: "UEFA", flag: "🇫🇷", color: "#0055A4", funFact: "Tiene la Torre Eiffel y ganó el mundial de Rusia 2018." },
  { code: "ENG", name: "Inglaterra", capital: "Londres", language: "Inglés", confederation: "UEFA", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", color: "#CE1124", funFact: "El fútbol nació allí." },
  { code: "GER", name: "Alemania", capital: "Berlín", language: "Alemán", confederation: "UEFA", flag: "🇩🇪", color: "#FFCE00", funFact: "Ganó 4 mundiales." },
  { code: "ITA", name: "Italia", capital: "Roma", language: "Italiano", confederation: "UEFA", flag: "🇮🇹", color: "#008C45", funFact: "Es famosa por la pizza, la pasta y el Coliseo." },
  { code: "POR", name: "Portugal", capital: "Lisboa", language: "Portugués", confederation: "UEFA", flag: "🇵🇹", color: "#006600", funFact: "Cristiano Ronaldo nació allí." },
  { code: "NED", name: "Países Bajos", capital: "Ámsterdam", language: "Neerlandés", confederation: "UEFA", flag: "🇳🇱", color: "#FF6900", funFact: "También se le dice Holanda y tiene muchos molinos de viento." },
  { code: "BEL", name: "Bélgica", capital: "Bruselas", language: "Neerlandés, Francés y Alemán", confederation: "UEFA", flag: "🇧🇪", color: "#FAE042", funFact: "Es famosa por el chocolate y las papas fritas." },
  { code: "CRO", name: "Croacia", capital: "Zagreb", language: "Croata", confederation: "UEFA", flag: "🇭🇷", color: "#FF0000", funFact: "Su camiseta es a cuadros rojos y blancos." },
  { code: "SUI", name: "Suiza", capital: "Berna", language: "Alemán, Francés e Italiano", confederation: "UEFA", flag: "🇨🇭", color: "#DA291C", funFact: "Es famosa por sus relojes y su chocolate." },
  { code: "DEN", name: "Dinamarca", capital: "Copenhague", language: "Danés", confederation: "UEFA", flag: "🇩🇰", color: "#C8102E", funFact: "Tiene la estatua de La Sirenita." },
  { code: "POL", name: "Polonia", capital: "Varsovia", language: "Polaco", confederation: "UEFA", flag: "🇵🇱", color: "#DC143C", funFact: "Lewandowski, uno de los mejores goleadores, es polaco." },
  { code: "AUT", name: "Austria", capital: "Viena", language: "Alemán", confederation: "UEFA", flag: "🇦🇹", color: "#ED2939", funFact: "Mozart nació allí." },
  { code: "NOR", name: "Noruega", capital: "Oslo", language: "Noruego", confederation: "UEFA", flag: "🇳🇴", color: "#002868", funFact: "Allí están los fiordos y la aurora boreal." },
  { code: "SCO", name: "Escocia", capital: "Edimburgo", language: "Inglés y Gaélico", confederation: "UEFA", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", color: "#0065BD", funFact: "Es famosa por sus castillos y las gaitas." },
  { code: "TUR", name: "Turquía", capital: "Ankara", language: "Turco", confederation: "UEFA", flag: "🇹🇷", color: "#E30A17", funFact: "Está entre Europa y Asia." },
  { code: "WAL", name: "Gales", capital: "Cardiff", language: "Inglés y Galés", confederation: "UEFA", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", color: "#D30731", funFact: "Su bandera tiene un dragón rojo." },

  // CAF
  { code: "MAR", name: "Marruecos", capital: "Rabat", language: "Árabe", confederation: "CAF", flag: "🇲🇦", color: "#C1272D", funFact: "Llegó a semifinales en Qatar 2022." },
  { code: "SEN", name: "Senegal", capital: "Dakar", language: "Francés", confederation: "CAF", flag: "🇸🇳", color: "#00853F", funFact: "Está en África occidental y le dicen Los Leones." },
  { code: "TUN", name: "Túnez", capital: "Túnez", language: "Árabe", confederation: "CAF", flag: "🇹🇳", color: "#E70013", funFact: "Está en el norte de África, sobre el Mediterráneo." },
  { code: "EGY", name: "Egipto", capital: "El Cairo", language: "Árabe", confederation: "CAF", flag: "🇪🇬", color: "#CE1126", funFact: "Tiene las pirámides y la Esfinge." },
  { code: "ALG", name: "Argelia", capital: "Argel", language: "Árabe", confederation: "CAF", flag: "🇩🇿", color: "#006233", funFact: "Es el país más grande de África." },
  { code: "NGA", name: "Nigeria", capital: "Abuya", language: "Inglés", confederation: "CAF", flag: "🇳🇬", color: "#008751", funFact: "Su selección se llama Súper Águilas." },
  { code: "GHA", name: "Ghana", capital: "Acra", language: "Inglés", confederation: "CAF", flag: "🇬🇭", color: "#FCD116", funFact: "Le dicen las Estrellas Negras." },
  { code: "CIV", name: "Costa de Marfil", capital: "Yamusukro", language: "Francés", confederation: "CAF", flag: "🇨🇮", color: "#FF8200", funFact: "Su selección es Los Elefantes." },
  { code: "RSA", name: "Sudáfrica", capital: "Pretoria", language: "Inglés y Zulú", confederation: "CAF", flag: "🇿🇦", color: "#007749", funFact: "Fue anfitrión del Mundial 2010." },

  // AFC
  { code: "JPN", name: "Japón", capital: "Tokio", language: "Japonés", confederation: "AFC", flag: "🇯🇵", color: "#BC002D", funFact: "Es el país del sol naciente." },
  { code: "KOR", name: "Corea del Sur", capital: "Seúl", language: "Coreano", confederation: "AFC", flag: "🇰🇷", color: "#003478", funFact: "Fue anfitrión del Mundial 2002 junto a Japón." },
  { code: "IRN", name: "Irán", capital: "Teherán", language: "Persa", confederation: "AFC", flag: "🇮🇷", color: "#239F40", funFact: "Antes se llamaba Persia." },
  { code: "KSA", name: "Arabia Saudita", capital: "Riad", language: "Árabe", confederation: "AFC", flag: "🇸🇦", color: "#006C35", funFact: "Le ganó a Argentina en el primer partido del Mundial 2022." },
  { code: "AUS", name: "Australia", capital: "Canberra", language: "Inglés", confederation: "AFC", flag: "🇦🇺", color: "#FFCD00", funFact: "Es a la vez país y continente. Allí viven los canguros." },
  { code: "QAT", name: "Qatar", capital: "Doha", language: "Árabe", confederation: "AFC", flag: "🇶🇦", color: "#8D1B3D", funFact: "Fue sede del Mundial 2022." },
  { code: "IRQ", name: "Irak", capital: "Bagdad", language: "Árabe", confederation: "AFC", flag: "🇮🇶", color: "#CE1126", funFact: "Está en Medio Oriente, entre los ríos Tigris y Éufrates." },
  { code: "UZB", name: "Uzbekistán", capital: "Taskent", language: "Uzbeko", confederation: "AFC", flag: "🇺🇿", color: "#1EB53A", funFact: "Está en Asia Central, en la antigua Ruta de la Seda." },

  // CONCACAF (más)
  { code: "CRC", name: "Costa Rica", capital: "San José", language: "Español", confederation: "CONCACAF", flag: "🇨🇷", color: "#002B7F", funFact: "Su selección se llama La Sele y no tiene ejército." },
  { code: "PAN", name: "Panamá", capital: "Ciudad de Panamá", language: "Español", confederation: "CONCACAF", flag: "🇵🇦", color: "#005AA7", funFact: "Tiene el famoso Canal de Panamá." },
  { code: "JAM", name: "Jamaica", capital: "Kingston", language: "Inglés", confederation: "CONCACAF", flag: "🇯🇲", color: "#009B3A", funFact: "Es la cuna del reggae y Usain Bolt." },

  // OFC
  { code: "NZL", name: "Nueva Zelanda", capital: "Wellington", language: "Inglés y Maorí", confederation: "OFC", flag: "🇳🇿", color: "#000000", funFact: "Los All Blacks de rugby son de allí." },

  // Clasificados Mundial 2026 (faltantes)
  { code: "CZE", name: "Rep. Checa", capital: "Praga", language: "Checo", confederation: "UEFA", flag: "🇨🇿", color: "#11457E", funFact: "Praga es famosa por su reloj astronómico." },
  { code: "BIH", name: "Bosnia y Herzegovina", capital: "Sarajevo", language: "Bosnio", confederation: "UEFA", flag: "🇧🇦", color: "#002395", funFact: "Sarajevo fue sede de los Juegos Olímpicos de invierno 1984." },
  { code: "SWE", name: "Suecia", capital: "Estocolmo", language: "Sueco", confederation: "UEFA", flag: "🇸🇪", color: "#006AA7", funFact: "Allí se entregan los premios Nobel." },
  { code: "HAI", name: "Haití", capital: "Puerto Príncipe", language: "Francés y Creole", confederation: "CONCACAF", flag: "🇭🇹", color: "#00209F", funFact: "Comparte la isla La Española con Rep. Dominicana." },
  { code: "CUW", name: "Curazao", capital: "Willemstad", language: "Neerlandés y Papiamento", confederation: "CONCACAF", flag: "🇨🇼", color: "#002B7F", funFact: "Es una isla del Caribe con casas de colores." },
  { code: "CPV", name: "Cabo Verde", capital: "Praia", language: "Portugués", confederation: "CAF", flag: "🇨🇻", color: "#003893", funFact: "Es un archipiélago en el Atlántico, frente a África." },
  { code: "COD", name: "RD Congo", capital: "Kinsasa", language: "Francés", confederation: "CAF", flag: "🇨🇩", color: "#007FFF", funFact: "El río Congo es el más profundo del mundo." },
  { code: "JOR", name: "Jordania", capital: "Amán", language: "Árabe", confederation: "AFC", flag: "🇯🇴", color: "#007A3D", funFact: "Allí está Petra, una de las 7 maravillas del mundo." },
];

export const getTeam = (code: string) => TEAMS.find((t) => t.code === code);
