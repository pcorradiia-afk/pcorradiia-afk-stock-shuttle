export type Category = "geografia" | "historia" | "matematica" | "ingles" | "futbol";
export type Level = "facil" | "medio";

export interface Question {
  id: string;
  category: Category;
  level: Level;
  prompt: string;
  options: string[];
  answer: number;
  hint?: string;
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string; color: string }> = {
  geografia: { label: "Geografía", emoji: "🌍", color: "from-emerald-400 to-teal-500" },
  historia: { label: "Historia", emoji: "📜", color: "from-amber-400 to-orange-500" },
  matematica: { label: "Matemática", emoji: "🔢", color: "from-sky-400 to-indigo-500" },
  ingles: { label: "Inglés", emoji: "🔤", color: "from-pink-400 to-rose-500" },
  futbol: { label: "Mundial", emoji: "⚽", color: "from-violet-400 to-fuchsia-500" },
};

export const QUESTIONS: Question[] = [
  // ============ GEOGRAFÍA ============
  // Fácil (2° grado - Otto)
  { id: "g-f-1", category: "geografia", level: "facil", prompt: "¿Cuál es la capital de Argentina?", options: ["Córdoba", "Buenos Aires", "Rosario", "Mendoza"], answer: 1 },
  { id: "g-f-2", category: "geografia", level: "facil", prompt: "¿Cuál de estos países es limítrofe con Argentina?", options: ["Uruguay", "Perú", "Ecuador", "Venezuela"], answer: 0, hint: "Está al otro lado del Río de la Plata." },
  { id: "g-f-3", category: "geografia", level: "facil", prompt: "¿De qué color es la bandera de Brasil principalmente?", options: ["Roja y blanca", "Azul y blanca", "Verde y amarilla", "Negra y dorada"], answer: 2 },
  { id: "g-f-4", category: "geografia", level: "facil", prompt: "¿En qué continente está España?", options: ["América", "Europa", "África", "Asia"], answer: 1 },
  { id: "g-f-5", category: "geografia", level: "facil", prompt: "¿Cuál es la capital de México?", options: ["Cancún", "Guadalajara", "Ciudad de México", "Monterrey"], answer: 2 },
  { id: "g-f-6", category: "geografia", level: "facil", prompt: "¿Qué animal aparece en la bandera de Canadá?", options: ["Un oso", "Una hoja de arce", "Un castor", "Un águila"], answer: 1 },
  { id: "g-f-7", category: "geografia", level: "facil", prompt: "¿Cuál de estos países es una isla / continente?", options: ["Australia", "Francia", "Egipto", "Croacia"], answer: 0 },
  { id: "g-f-8", category: "geografia", level: "facil", prompt: "¿En qué país está la Torre Eiffel?", options: ["Italia", "Alemania", "Francia", "Inglaterra"], answer: 2 },
  { id: "g-f-9", category: "geografia", level: "facil", prompt: "¿Cuál es la capital de Uruguay?", options: ["Punta del Este", "Montevideo", "Salto", "Colonia"], answer: 1 },
  { id: "g-f-10", category: "geografia", level: "facil", prompt: "¿Cuál de estos países NO es limítrofe con Argentina?", options: ["Chile", "Brasil", "Colombia", "Bolivia"], answer: 2 },
  { id: "g-f-11", category: "geografia", level: "facil", prompt: "¿De qué país son las pirámides famosas del Mundial 2026?", options: ["Marruecos", "Egipto", "Argelia", "Túnez"], answer: 1 },
  { id: "g-f-12", category: "geografia", level: "facil", prompt: "¿Qué país tiene forma de bota?", options: ["España", "Portugal", "Italia", "Croacia"], answer: 2 },

  // Medio (5° grado - Dante)
  { id: "g-m-1", category: "geografia", level: "medio", prompt: "¿Cuál es la capital de España?", options: ["Barcelona", "Sevilla", "Madrid", "Valencia"], answer: 2 },
  { id: "g-m-2", category: "geografia", level: "medio", prompt: "¿Cuál es la capital de Francia?", options: ["Lyon", "París", "Marsella", "Niza"], answer: 1 },
  { id: "g-m-3", category: "geografia", level: "medio", prompt: "¿En qué continente está Japón?", options: ["África", "Europa", "Asia", "Oceanía"], answer: 2 },
  { id: "g-m-4", category: "geografia", level: "medio", prompt: "¿Cuál es la capital de Alemania?", options: ["Múnich", "Hamburgo", "Berlín", "Fráncfort"], answer: 2 },
  { id: "g-m-5", category: "geografia", level: "medio", prompt: "¿Cuál es el país más grande de África que juega el Mundial 2026?", options: ["Marruecos", "Argelia", "Nigeria", "Egipto"], answer: 1 },
  { id: "g-m-6", category: "geografia", level: "medio", prompt: "¿Por qué se llama así Ecuador?", options: ["Por sus caballos", "Porque está sobre la línea del Ecuador", "Por su forma cuadrada", "Por su antigua moneda"], answer: 1 },
  { id: "g-m-7", category: "geografia", level: "medio", prompt: "¿Cuál es la capital de Portugal?", options: ["Lisboa", "Porto", "Braga", "Faro"], answer: 0 },
  { id: "g-m-8", category: "geografia", level: "medio", prompt: "¿Qué país tiene la Gran Muralla, aunque no juega el Mundial 2026?", options: ["Japón", "Corea del Sur", "China", "Mongolia"], answer: 2 },
  { id: "g-m-9", category: "geografia", level: "medio", prompt: "¿En qué país está la ciudad de Nueva York?", options: ["Canadá", "Estados Unidos", "México", "Costa Rica"], answer: 1 },
  { id: "g-m-10", category: "geografia", level: "medio", prompt: "¿Cuál es la capital de Corea del Sur?", options: ["Pekín", "Tokio", "Seúl", "Pyongyang"], answer: 2 },
  { id: "g-m-11", category: "geografia", level: "medio", prompt: "¿Cuál es la capital de Australia?", options: ["Sídney", "Melbourne", "Canberra", "Perth"], answer: 2, hint: "No es la ciudad más grande, ¡es engañoso!" },
  { id: "g-m-12", category: "geografia", level: "medio", prompt: "¿Qué país NO es limítrofe con Argentina?", options: ["Chile", "Paraguay", "Perú", "Bolivia"], answer: 2 },
  { id: "g-m-13", category: "geografia", level: "medio", prompt: "¿Cuál es la capital de Colombia?", options: ["Medellín", "Cali", "Bogotá", "Cartagena"], answer: 2 },
  { id: "g-m-14", category: "geografia", level: "medio", prompt: "¿Qué océano separa a Argentina de África?", options: ["Pacífico", "Atlántico", "Índico", "Ártico"], answer: 1 },
  { id: "g-m-15", category: "geografia", level: "medio", prompt: "¿En qué país está la ciudad de Ámsterdam?", options: ["Bélgica", "Alemania", "Países Bajos", "Dinamarca"], answer: 2 },

  // ============ HISTORIA ============
  // Fácil
  { id: "h-f-1", category: "historia", level: "facil", prompt: "¿De qué color es la escarapela argentina?", options: ["Verde y blanca", "Celeste y blanca", "Roja y blanca", "Azul y amarilla"], answer: 1 },
  { id: "h-f-2", category: "historia", level: "facil", prompt: "¿Qué se festeja el 25 de Mayo en Argentina?", options: ["La Independencia", "La Revolución de Mayo", "El Día de la Bandera", "El Día del Amigo"], answer: 1 },
  { id: "h-f-3", category: "historia", level: "facil", prompt: "¿Quién creó la bandera argentina?", options: ["San Martín", "Belgrano", "Sarmiento", "Moreno"], answer: 1 },
  { id: "h-f-4", category: "historia", level: "facil", prompt: "¿Qué se celebra el 9 de Julio en Argentina?", options: ["Día de la Bandera", "Revolución de Mayo", "Independencia", "Día del Maestro"], answer: 2 },
  { id: "h-f-5", category: "historia", level: "facil", prompt: "¿En qué año descubrió América Cristóbal Colón?", options: ["1492", "1810", "1816", "1500"], answer: 0 },
  { id: "h-f-6", category: "historia", level: "facil", prompt: "¿De qué país vinieron los conquistadores que llegaron a América en 1492?", options: ["Portugal", "Inglaterra", "España", "Francia"], answer: 2 },

  // Medio
  { id: "h-m-1", category: "historia", level: "medio", prompt: "¿En qué año se declaró la Independencia Argentina?", options: ["1810", "1816", "1820", "1853"], answer: 1 },
  { id: "h-m-2", category: "historia", level: "medio", prompt: "¿Quién cruzó los Andes para liberar Chile y Perú?", options: ["Manuel Belgrano", "San Martín", "Bernardino Rivadavia", "Mariano Moreno"], answer: 1 },
  { id: "h-m-3", category: "historia", level: "medio", prompt: "¿En qué ciudad se firmó la Independencia Argentina?", options: ["Buenos Aires", "Córdoba", "Tucumán", "Salta"], answer: 2 },
  { id: "h-m-4", category: "historia", level: "medio", prompt: "¿Qué imperio antiguo estaba en el actual Perú antes de la conquista española?", options: ["Inca", "Azteca", "Maya", "Romano"], answer: 0 },
  { id: "h-m-5", category: "historia", level: "medio", prompt: "¿Qué imperio antiguo estaba en el actual México?", options: ["Inca", "Azteca", "Egipcio", "Persa"], answer: 1 },
  { id: "h-m-6", category: "historia", level: "medio", prompt: "¿Qué país tiene la cultura faraónica y las pirámides?", options: ["Marruecos", "Egipto", "Argelia", "Túnez"], answer: 1 },
  { id: "h-m-7", category: "historia", level: "medio", prompt: "¿En qué país nació Mozart?", options: ["Alemania", "Austria", "Italia", "Suiza"], answer: 1 },
  { id: "h-m-8", category: "historia", level: "medio", prompt: "¿Qué país construyó la Gran Muralla?", options: ["Japón", "China", "Corea", "Mongolia"], answer: 1 },

  // ============ MATEMÁTICA ============
  // Fácil
  { id: "m-f-1", category: "matematica", level: "facil", prompt: "Si Argentina marca 3 goles y Uruguay 2, ¿cuántos goles hubo en total?", options: ["4", "5", "6", "7"], answer: 1 },
  { id: "m-f-2", category: "matematica", level: "facil", prompt: "Un equipo de fútbol tiene 11 jugadores. Si entran 3 suplentes, ¿cuántos jugaron en total?", options: ["13", "14", "15", "12"], answer: 1 },
  { id: "m-f-3", category: "matematica", level: "facil", prompt: "¿Cuánto es 7 + 8?", options: ["14", "15", "16", "17"], answer: 1 },
  { id: "m-f-4", category: "matematica", level: "facil", prompt: "¿Cuánto es 6 × 2?", options: ["8", "10", "12", "14"], answer: 2 },
  { id: "m-f-5", category: "matematica", level: "facil", prompt: "Un partido dura 90 minutos. Si ya pasaron 45, ¿cuántos faltan?", options: ["30", "40", "45", "50"], answer: 2 },
  { id: "m-f-6", category: "matematica", level: "facil", prompt: "¿Cuánto es 20 - 7?", options: ["12", "13", "14", "15"], answer: 1 },
  { id: "m-f-7", category: "matematica", level: "facil", prompt: "En una figurita está el número 5 y otra el 4. ¿Cuál es mayor?", options: ["5", "4", "Son iguales", "Ninguna"], answer: 0 },
  { id: "m-f-8", category: "matematica", level: "facil", prompt: "Si juntás 3 paquetes de figuritas con 5 cada uno, ¿cuántas figuritas tenés?", options: ["10", "12", "15", "20"], answer: 2 },
  { id: "m-f-9", category: "matematica", level: "facil", prompt: "¿Cuánto es 9 + 9?", options: ["16", "17", "18", "19"], answer: 2 },
  { id: "m-f-10", category: "matematica", level: "facil", prompt: "Si en un Mundial hay 32 equipos y se suman 16 más, ¿cuántos hay?", options: ["40", "48", "50", "46"], answer: 1, hint: "¡Justo los del Mundial 2026!" },

  // Medio
  { id: "m-m-1", category: "matematica", level: "medio", prompt: "Si Brasil ganó 5 mundiales y Argentina 3, ¿cuántos más ganó Brasil?", options: ["1", "2", "3", "4"], answer: 1 },
  { id: "m-m-2", category: "matematica", level: "medio", prompt: "¿Cuánto es 12 × 8?", options: ["86", "92", "96", "108"], answer: 2 },
  { id: "m-m-3", category: "matematica", level: "medio", prompt: "El Mundial 2026 tiene 48 equipos divididos en 12 grupos. ¿Cuántos equipos por grupo?", options: ["3", "4", "5", "6"], answer: 1 },
  { id: "m-m-4", category: "matematica", level: "medio", prompt: "Si un equipo gana 3 partidos y empata 1, ¿cuántos puntos suma? (Ganar=3, empate=1)", options: ["8", "9", "10", "11"], answer: 2 },
  { id: "m-m-5", category: "matematica", level: "medio", prompt: "¿Cuánto es 144 ÷ 12?", options: ["10", "11", "12", "13"], answer: 2 },
  { id: "m-m-6", category: "matematica", level: "medio", prompt: "Si una figurita vale $250 y comprás 4, ¿cuánto gastás?", options: ["$800", "$900", "$1000", "$1200"], answer: 2 },
  { id: "m-m-7", category: "matematica", level: "medio", prompt: "¿Cuál es el doble de 17?", options: ["32", "34", "36", "38"], answer: 1 },
  { id: "m-m-8", category: "matematica", level: "medio", prompt: "Un álbum tiene 240 figuritas. Si tengo 180, ¿cuántas me faltan?", options: ["50", "60", "70", "80"], answer: 1 },
  { id: "m-m-9", category: "matematica", level: "medio", prompt: "¿Cuánto es 7 × 9?", options: ["56", "63", "64", "72"], answer: 1 },
  { id: "m-m-10", category: "matematica", level: "medio", prompt: "Si un partido empieza a las 16:00 y dura 1 hora 45 minutos, ¿cuándo termina?", options: ["17:30", "17:45", "18:00", "18:15"], answer: 1 },

  // ============ INGLÉS ============
  // Fácil
  { id: "i-f-1", category: "ingles", level: "facil", prompt: "¿Cómo se dice 'pelota' en inglés?", options: ["Bull", "Ball", "Bell", "Belt"], answer: 1 },
  { id: "i-f-2", category: "ingles", level: "facil", prompt: "¿Cómo se dice 'rojo' en inglés?", options: ["Blue", "Green", "Red", "Black"], answer: 2 },
  { id: "i-f-3", category: "ingles", level: "facil", prompt: "¿Cómo se dice 'gato' en inglés?", options: ["Dog", "Cat", "Cow", "Fish"], answer: 1 },
  { id: "i-f-4", category: "ingles", level: "facil", prompt: "¿Cómo se dice 'uno' en inglés?", options: ["Two", "Three", "One", "Four"], answer: 2 },
  { id: "i-f-5", category: "ingles", level: "facil", prompt: "En Estados Unidos, ¿cómo se dice 'hola'?", options: ["Bonjour", "Hello", "Ciao", "Hallo"], answer: 1 },
  { id: "i-f-6", category: "ingles", level: "facil", prompt: "¿Cómo se dice 'amigo' en inglés?", options: ["Brother", "Friend", "Father", "Family"], answer: 1 },
  { id: "i-f-7", category: "ingles", level: "facil", prompt: "¿Cómo se dice 'casa' en inglés?", options: ["Hose", "House", "Horse", "Hours"], answer: 1 },
  { id: "i-f-8", category: "ingles", level: "facil", prompt: "¿Cómo se dice 'agua' en inglés?", options: ["Milk", "Water", "Juice", "Wine"], answer: 1 },

  // Medio
  { id: "i-m-1", category: "ingles", level: "medio", prompt: "En Estados Unidos, ¿cómo se dice 'cena'?", options: ["Breakfast", "Lunch", "Dinner", "Snack"], answer: 2, hint: "Lunch es almuerzo y breakfast es desayuno." },
  { id: "i-m-2", category: "ingles", level: "medio", prompt: "¿Cómo se dice 'arquero' (de fútbol) en inglés?", options: ["Striker", "Goalkeeper", "Defender", "Coach"], answer: 1 },
  { id: "i-m-3", category: "ingles", level: "medio", prompt: "¿Cómo se dice 'partido' (de fútbol) en inglés?", options: ["Game", "Match", "Cup", "Set"], answer: 1 },
  { id: "i-m-4", category: "ingles", level: "medio", prompt: "¿Cómo se dice 'campo' (de fútbol) en inglés?", options: ["Court", "Field", "Track", "Yard"], answer: 1 },
  { id: "i-m-5", category: "ingles", level: "medio", prompt: "¿Cómo se dice 'ganar' en inglés?", options: ["Lose", "Tie", "Win", "Play"], answer: 2 },
  { id: "i-m-6", category: "ingles", level: "medio", prompt: "¿Qué significa 'World Cup'?", options: ["Copa del mundo", "Copa de oro", "Liga mundial", "Estadio mundial"], answer: 0 },
  { id: "i-m-7", category: "ingles", level: "medio", prompt: "¿Cómo se dice 'desayuno' en inglés?", options: ["Lunch", "Dinner", "Breakfast", "Snack"], answer: 2 },
  { id: "i-m-8", category: "ingles", level: "medio", prompt: "¿Qué significa 'team'?", options: ["Tiempo", "Equipo", "Tema", "Tienda"], answer: 1 },
  { id: "i-m-9", category: "ingles", level: "medio", prompt: "¿Cómo se dice 'pierna' en inglés?", options: ["Arm", "Foot", "Leg", "Hand"], answer: 2 },
  { id: "i-m-10", category: "ingles", level: "medio", prompt: "¿Qué significa 'goal'?", options: ["Tarjeta", "Gol", "Falta", "Penal"], answer: 1 },

  // ============ FÚTBOL / MUNDIAL ============
  // Fácil
  { id: "f-f-1", category: "futbol", level: "facil", prompt: "¿Quién ganó el Mundial 2022 en Qatar?", options: ["Brasil", "Francia", "Argentina", "Alemania"], answer: 2 },
  { id: "f-f-2", category: "futbol", level: "facil", prompt: "¿Cuántos jugadores hay en cada equipo dentro de la cancha?", options: ["9", "10", "11", "12"], answer: 2 },
  { id: "f-f-3", category: "futbol", level: "facil", prompt: "¿En qué países se juega el Mundial 2026?", options: ["México, Argentina y Brasil", "USA, Canadá y México", "USA, Brasil y Canadá", "México, USA y Costa Rica"], answer: 1 },
  { id: "f-f-4", category: "futbol", level: "facil", prompt: "¿Quién es el capitán de la Selección Argentina?", options: ["Di María", "Messi", "Lautaro Martínez", "Otamendi"], answer: 1 },
  { id: "f-f-5", category: "futbol", level: "facil", prompt: "¿Cuántos equipos juegan el Mundial 2026?", options: ["32", "40", "48", "64"], answer: 2 },
  { id: "f-f-6", category: "futbol", level: "facil", prompt: "¿De qué color es la camiseta titular de Argentina?", options: ["Blanca", "Celeste y blanca", "Azul", "Negra"], answer: 1 },
  { id: "f-f-7", category: "futbol", level: "facil", prompt: "¿Cuánto dura un partido (sin alargue)?", options: ["60 minutos", "80 minutos", "90 minutos", "100 minutos"], answer: 2 },

  // Medio
  { id: "f-m-1", category: "futbol", level: "medio", prompt: "¿Cuántos mundiales ganó Argentina?", options: ["1", "2", "3", "4"], answer: 2 },
  { id: "f-m-2", category: "futbol", level: "medio", prompt: "¿En qué año ganó Argentina su primer mundial?", options: ["1978", "1986", "2022", "1974"], answer: 0 },
  { id: "f-m-3", category: "futbol", level: "medio", prompt: "¿Cuál es el país con más mundiales ganados?", options: ["Argentina", "Brasil", "Alemania", "Italia"], answer: 1 },
  { id: "f-m-4", category: "futbol", level: "medio", prompt: "¿En qué país se jugó el primer Mundial en 1930?", options: ["Argentina", "Brasil", "Uruguay", "Italia"], answer: 2 },
  { id: "f-m-5", category: "futbol", level: "medio", prompt: "¿Cuántos minutos dura cada tiempo de un partido?", options: ["30", "40", "45", "50"], answer: 2 },
  { id: "f-m-6", category: "futbol", level: "medio", prompt: "¿Cuántos cambios pueden hacerse normalmente en un partido?", options: ["3", "5", "6", "7"], answer: 1 },
  { id: "f-m-7", category: "futbol", level: "medio", prompt: "¿Cuál de estos NO es un anfitrión del Mundial 2026?", options: ["Estados Unidos", "Canadá", "Brasil", "México"], answer: 2 },
  { id: "f-m-8", category: "futbol", level: "medio", prompt: "¿En qué país juega Lionel Messi en 2026?", options: ["España", "Argentina", "Estados Unidos", "Francia"], answer: 2, hint: "Juega en el Inter Miami." },
  { id: "f-m-9", category: "futbol", level: "medio", prompt: "¿Cómo se llama la selección de Brasil por su color?", options: ["La Roja", "La Albiceleste", "La Verdeamarela", "Los Tres Leones"], answer: 2 },
  { id: "f-m-10", category: "futbol", level: "medio", prompt: "¿Cuántos goles hizo Messi en el Mundial 2022?", options: ["5", "6", "7", "8"], answer: 2 },
];

export function pickQuestions(level: Level, count = 5, categories?: Category[]): Question[] {
  const pool = QUESTIONS.filter((q) => {
    if (q.level !== level) return false;
    if (categories && categories.length > 0 && !categories.includes(q.category)) return false;
    return true;
  });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
