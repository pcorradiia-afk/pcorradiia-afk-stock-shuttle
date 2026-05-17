export type Category =
  | "matematica"
  | "lengua"
  | "historia"
  | "geografia"
  | "cultura"
  | "deporte"
  | "ciencias"
  | "ingles"
  | "acertijos";

export type Level =
  | "primaria-baja" // 1° y 2° grado
  | "primaria-media" // 3° y 4° grado
  | "primaria-alta" // 5° y 6° grado
  | "secundaria-baja" // 1°, 2°, 3° año
  | "secundaria-alta"; // 4°, 5°, 6° año

export interface Question {
  id: string;
  category: Category;
  level: Level;
  prompt: string;
  options: string[];
  answer: number;
  hint?: string;
}

export const CATEGORIES: Category[] = [
  "matematica",
  "lengua",
  "historia",
  "geografia",
  "cultura",
  "deporte",
  "ciencias",
  "ingles",
  "acertijos",
];

export const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string; color: string; solid: string }
> = {
  matematica: { label: "Matemática", emoji: "🔢", color: "from-sky-400 to-indigo-500", solid: "#0ea5e9" },
  lengua: { label: "Lengua", emoji: "📖", color: "from-pink-400 to-rose-500", solid: "#ec4899" },
  historia: { label: "Historia", emoji: "📜", color: "from-amber-400 to-orange-500", solid: "#f59e0b" },
  geografia: { label: "Geografía", emoji: "🌍", color: "from-emerald-400 to-teal-500", solid: "#10b981" },
  cultura: { label: "Cultura", emoji: "🎭", color: "from-purple-400 to-fuchsia-500", solid: "#a855f7" },
  deporte: { label: "Deporte", emoji: "⚽", color: "from-violet-400 to-fuchsia-500", solid: "#8b5cf6" },
  ciencias: { label: "Ciencias", emoji: "🔬", color: "from-cyan-400 to-sky-500", solid: "#06b6d4" },
  ingles: { label: "Inglés", emoji: "🔤", color: "from-red-400 to-rose-500", solid: "#ef4444" },
  acertijos: { label: "Acertijos", emoji: "🧩", color: "from-yellow-400 to-amber-500", solid: "#eab308" },
};

export const LEVEL_META: Record<Level, { label: string; short: string }> = {
  "primaria-baja": { label: "Primaria 1° y 2° grado", short: "1°-2° primaria" },
  "primaria-media": { label: "Primaria 3° y 4° grado", short: "3°-4° primaria" },
  "primaria-alta": { label: "Primaria 5° y 6° grado", short: "5°-6° primaria" },
  "secundaria-baja": { label: "Secundaria 1°, 2° y 3° año", short: "1°-3° secundaria" },
  "secundaria-alta": { label: "Secundaria 4°, 5° y 6° año", short: "4°-6° secundaria" },
};

export const LEVEL_ORDER: Level[] = [
  "primaria-baja",
  "primaria-media",
  "primaria-alta",
  "secundaria-baja",
  "secundaria-alta",
];

// Base time (seconds) per level; matemática +5, acertijos +7
export function timeLimitFor(category: Category, level: Level): number {
  const base: Record<Level, number> = {
    "primaria-baja": 18,
    "primaria-media": 15,
    "primaria-alta": 13,
    "secundaria-baja": 11,
    "secundaria-alta": 10,
  };
  let t = base[level];
  if (category === "matematica") t += 5;
  if (category === "acertijos") t += 7;
  return t;
}

export const QUESTIONS: Question[] = [
  // ============================================================
  // PRIMARIA 1° y 2° grado  (Otto, 7 años, 2° grado)
  // ============================================================

  // -- Matemática (1°-2°)
  { id: "mat-pb-1", category: "matematica", level: "primaria-baja", prompt: "¿Cuánto es 5 + 3?", options: ["7", "8", "9", "10"], answer: 1 },
  { id: "mat-pb-2", category: "matematica", level: "primaria-baja", prompt: "¿Cuánto es 10 - 4?", options: ["4", "5", "6", "7"], answer: 2 },
  { id: "mat-pb-3", category: "matematica", level: "primaria-baja", prompt: "¿Cuánto es 2 × 3?", options: ["5", "6", "7", "8"], answer: 1 },
  { id: "mat-pb-4", category: "matematica", level: "primaria-baja", prompt: "Argentina mete 3 goles y Brasil 2. ¿Cuántos goles hubo?", options: ["4", "5", "6", "7"], answer: 1 },
  { id: "mat-pb-5", category: "matematica", level: "primaria-baja", prompt: "¿Cuál número está entre 7 y 9?", options: ["6", "8", "10", "11"], answer: 1 },
  { id: "mat-pb-6", category: "matematica", level: "primaria-baja", prompt: "Tengo 4 figuritas y me dan 5 más. ¿Cuántas tengo?", options: ["8", "9", "10", "11"], answer: 1 },
  { id: "mat-pb-7", category: "matematica", level: "primaria-baja", prompt: "El doble de 6 es...", options: ["8", "10", "12", "14"], answer: 2 },
  { id: "mat-pb-8", category: "matematica", level: "primaria-baja", prompt: "¿Cuál es par?", options: ["7", "5", "8", "3"], answer: 2 },

  // -- Lengua (1°-2°)
  { id: "len-pb-1", category: "lengua", level: "primaria-baja", prompt: "¿Cuál palabra está bien escrita?", options: ["Vaca", "Baca", "Vacca", "Vakca"], answer: 0 },
  { id: "len-pb-2", category: "lengua", level: "primaria-baja", prompt: "¿Cuántas sílabas tiene PE-LO-TA?", options: ["2", "3", "4", "5"], answer: 1 },
  { id: "len-pb-3", category: "lengua", level: "primaria-baja", prompt: "El plural de 'pez' es...", options: ["pezes", "pez", "peces", "pezs"], answer: 2 },
  { id: "len-pb-4", category: "lengua", level: "primaria-baja", prompt: "El femenino de 'rey' es...", options: ["reyna", "reina", "reia", "reine"], answer: 1 },
  { id: "len-pb-5", category: "lengua", level: "primaria-baja", prompt: "El antónimo (contrario) de 'alto' es...", options: ["grande", "rápido", "bajo", "ancho"], answer: 2 },
  { id: "len-pb-6", category: "lengua", level: "primaria-baja", prompt: "¿Con qué letra empieza 'zapato'?", options: ["S", "Z", "C", "X"], answer: 1 },
  { id: "len-pb-7", category: "lengua", level: "primaria-baja", prompt: "¿Cuál de estas es un sustantivo?", options: ["correr", "mesa", "rápido", "azul"], answer: 1 },
  { id: "len-pb-8", category: "lengua", level: "primaria-baja", prompt: "¿Qué palabra rima con 'gol'?", options: ["mar", "sol", "luz", "pan"], answer: 1 },

  // -- Historia (1°-2°)
  { id: "his-pb-1", category: "historia", level: "primaria-baja", prompt: "¿De qué colores es la bandera argentina?", options: ["Verde y blanca", "Celeste y blanca", "Roja y blanca", "Azul y amarilla"], answer: 1 },
  { id: "his-pb-2", category: "historia", level: "primaria-baja", prompt: "¿Qué se festeja el 25 de Mayo?", options: ["La Independencia", "La Revolución de Mayo", "El Día de la Bandera", "El Día del Niño"], answer: 1 },
  { id: "his-pb-3", category: "historia", level: "primaria-baja", prompt: "¿Quién creó la bandera argentina?", options: ["San Martín", "Belgrano", "Sarmiento", "Moreno"], answer: 1 },
  { id: "his-pb-4", category: "historia", level: "primaria-baja", prompt: "¿Qué hay en el medio de la bandera argentina?", options: ["Un león", "Un sol", "Un escudo", "Una estrella"], answer: 1 },
  { id: "his-pb-5", category: "historia", level: "primaria-baja", prompt: "¿Qué se festeja el 9 de Julio?", options: ["La Bandera", "La Independencia", "El Maestro", "La Tradición"], answer: 1 },
  { id: "his-pb-6", category: "historia", level: "primaria-baja", prompt: "¿En qué continente está Argentina?", options: ["Europa", "Asia", "América", "África"], answer: 2 },

  // -- Geografía (1°-2°)
  { id: "geo-pb-1", category: "geografia", level: "primaria-baja", prompt: "¿Cuál es la capital de Argentina?", options: ["Córdoba", "Buenos Aires", "Rosario", "Mendoza"], answer: 1 },
  { id: "geo-pb-2", category: "geografia", level: "primaria-baja", prompt: "¿Cuál país es limítrofe con Argentina?", options: ["Uruguay", "Perú", "Ecuador", "Venezuela"], answer: 0 },
  { id: "geo-pb-3", category: "geografia", level: "primaria-baja", prompt: "¿De qué color es la bandera de Brasil principalmente?", options: ["Roja y blanca", "Azul y blanca", "Verde y amarilla", "Negra y oro"], answer: 2 },
  { id: "geo-pb-4", category: "geografia", level: "primaria-baja", prompt: "¿Cuál es la capital de Uruguay?", options: ["Punta del Este", "Montevideo", "Salto", "Colonia"], answer: 1 },
  { id: "geo-pb-5", category: "geografia", level: "primaria-baja", prompt: "¿Qué hay en la bandera de Canadá?", options: ["Una estrella", "Una hoja de arce", "Un castor", "Un águila"], answer: 1 },
  { id: "geo-pb-6", category: "geografia", level: "primaria-baja", prompt: "¿En qué país está la Torre Eiffel?", options: ["Italia", "Alemania", "Francia", "Inglaterra"], answer: 2 },
  { id: "geo-pb-7", category: "geografia", level: "primaria-baja", prompt: "¿Cuál país NO limita con Argentina?", options: ["Chile", "Brasil", "Colombia", "Bolivia"], answer: 2 },
  { id: "geo-pb-8", category: "geografia", level: "primaria-baja", prompt: "¿Qué país tiene forma de bota?", options: ["España", "Italia", "Portugal", "Croacia"], answer: 1 },

  // -- Cultura (1°-2°)
  { id: "cul-pb-1", category: "cultura", level: "primaria-baja", prompt: "¿Cuántos días tiene una semana?", options: ["5", "6", "7", "8"], answer: 2 },
  { id: "cul-pb-2", category: "cultura", level: "primaria-baja", prompt: "¿Cuántos meses tiene el año?", options: ["10", "11", "12", "13"], answer: 2 },
  { id: "cul-pb-3", category: "cultura", level: "primaria-baja", prompt: "¿Cuántos colores tiene el arcoíris?", options: ["5", "6", "7", "8"], answer: 2 },
  { id: "cul-pb-4", category: "cultura", level: "primaria-baja", prompt: "¿Quién es el ratón más famoso de Disney?", options: ["Jerry", "Mickey", "Stuart", "Speedy"], answer: 1 },
  { id: "cul-pb-5", category: "cultura", level: "primaria-baja", prompt: "¿De qué color suele dibujarse el Sol?", options: ["Azul", "Amarillo", "Verde", "Rojo"], answer: 1 },
  { id: "cul-pb-6", category: "cultura", level: "primaria-baja", prompt: "¿Cuál es un instrumento musical?", options: ["Guitarra", "Cuchillo", "Cuchara", "Lápiz"], answer: 0 },

  // -- Deporte (1°-2°)
  { id: "dep-pb-1", category: "deporte", level: "primaria-baja", prompt: "¿Cuántos jugadores juegan al fútbol en cancha por equipo?", options: ["9", "10", "11", "12"], answer: 2 },
  { id: "dep-pb-2", category: "deporte", level: "primaria-baja", prompt: "¿Quién ganó el Mundial de Qatar 2022?", options: ["Brasil", "Francia", "Argentina", "Alemania"], answer: 2 },
  { id: "dep-pb-3", category: "deporte", level: "primaria-baja", prompt: "¿Quién es el capitán de la Selección Argentina?", options: ["Di María", "Messi", "Lautaro", "Otamendi"], answer: 1 },
  { id: "dep-pb-4", category: "deporte", level: "primaria-baja", prompt: "¿De qué color es la camiseta titular de Argentina?", options: ["Blanca", "Celeste y blanca", "Azul", "Negra"], answer: 1 },
  { id: "dep-pb-5", category: "deporte", level: "primaria-baja", prompt: "¿Con qué deporte se relacionan Messi y Maradona?", options: ["Básquet", "Tenis", "Fútbol", "Vóley"], answer: 2 },
  { id: "dep-pb-6", category: "deporte", level: "primaria-baja", prompt: "¿En qué deporte se usa una pelota naranja grande?", options: ["Vóley", "Básquet", "Tenis", "Hockey"], answer: 1 },
  { id: "dep-pb-7", category: "deporte", level: "primaria-baja", prompt: "¿En qué países se juega el Mundial 2026?", options: ["México, Argentina y Brasil", "USA, Canadá y México", "USA, Brasil y Canadá", "México, USA y Costa Rica"], answer: 1 },
  { id: "dep-pb-8", category: "deporte", level: "primaria-baja", prompt: "🏆 ¿Cuántos países juegan el Mundial 2026?", options: ["24", "32", "48", "64"], answer: 2, hint: "¡Más que nunca en la historia!" },
  { id: "dep-pb-9", category: "deporte", level: "primaria-baja", prompt: "🦅 La mascota de Estados Unidos para el Mundial 2026 es un...", options: ["Oso", "Águila calva", "Búfalo", "Pingüino"], answer: 1, hint: "Es el animal del escudo de USA." },
  { id: "dep-pb-10", category: "deporte", level: "primaria-baja", prompt: "🐆 La mascota mexicana del Mundial 2026 es un...", options: ["Jaguar", "Burrito", "Cóndor", "Coyote"], answer: 0 },
  { id: "dep-pb-11", category: "deporte", level: "primaria-baja", prompt: "🫎 La mascota canadiense del Mundial 2026 es un...", options: ["Castor", "Oso polar", "Alce", "Reno"], answer: 2 },
  { id: "dep-pb-12", category: "deporte", level: "primaria-baja", prompt: "🇦🇷 ¿Cómo le dicen a la Selección Argentina?", options: ["La Roja", "La Albiceleste", "La Verdeamarela", "Los Tres Leones"], answer: 1 },
  { id: "dep-pb-13", category: "deporte", level: "primaria-baja", prompt: "🧤 ¿Cómo le dicen al arquero argentino Emiliano Martínez?", options: ["El Pibe", "Dibu", "Chiqui", "Lobo"], answer: 1 },
  { id: "dep-pb-14", category: "deporte", level: "primaria-baja", prompt: "⚽ ¿Cuánto vale un gol?", options: ["1 punto", "2 puntos", "3 puntos", "Depende"], answer: 0 },
  { id: "dep-pb-15", category: "deporte", level: "primaria-baja", prompt: "🏆 ¿Cada cuántos años se juega el Mundial?", options: ["2", "3", "4", "5"], answer: 2 },
  { id: "dep-pb-16", category: "deporte", level: "primaria-baja", prompt: "🎽 ¿De qué color es la camiseta SUPLENTE de Argentina (la alternativa)?", options: ["Roja", "Verde", "Violeta o negra", "Naranja"], answer: 2, hint: "Suele ser oscura, distinta a la celeste." },

  // -- Ciencias (1°-2°)
  { id: "cie-pb-1", category: "ciencias", level: "primaria-baja", prompt: "¿De dónde sacan la miel?", options: ["De las hormigas", "De las abejas", "De las moscas", "De las arañas"], answer: 1 },
  { id: "cie-pb-2", category: "ciencias", level: "primaria-baja", prompt: "¿Cuántas patas tiene una araña?", options: ["6", "8", "10", "4"], answer: 1 },
  { id: "cie-pb-3", category: "ciencias", level: "primaria-baja", prompt: "¿Qué le pasa al agua si la metés al freezer?", options: ["Hierve", "Se evapora", "Se congela", "Desaparece"], answer: 2 },
  { id: "cie-pb-4", category: "ciencias", level: "primaria-baja", prompt: "¿Qué necesitan las plantas para vivir?", options: ["Solo agua", "Solo sol", "Agua y sol", "Nada"], answer: 2 },
  { id: "cie-pb-5", category: "ciencias", level: "primaria-baja", prompt: "¿Qué animal pone huevos?", options: ["Vaca", "Perro", "Gallina", "Caballo"], answer: 2 },
  { id: "cie-pb-6", category: "ciencias", level: "primaria-baja", prompt: "¿Cuántos sentidos tenemos las personas?", options: ["3", "4", "5", "6"], answer: 2 },
  { id: "cie-pb-7", category: "ciencias", level: "primaria-baja", prompt: "¿Con qué órgano respiramos?", options: ["Corazón", "Pulmones", "Hígado", "Riñones"], answer: 1 },

  // -- Inglés (1°-2°)
  { id: "ing-pb-1", category: "ingles", level: "primaria-baja", prompt: "¿Cómo se dice 'pelota' en inglés?", options: ["Bull", "Ball", "Bell", "Belt"], answer: 1 },
  { id: "ing-pb-2", category: "ingles", level: "primaria-baja", prompt: "¿Cómo se dice 'rojo' en inglés?", options: ["Blue", "Green", "Red", "Black"], answer: 2 },
  { id: "ing-pb-3", category: "ingles", level: "primaria-baja", prompt: "¿Cómo se dice 'gato' en inglés?", options: ["Dog", "Cat", "Cow", "Fish"], answer: 1 },
  { id: "ing-pb-4", category: "ingles", level: "primaria-baja", prompt: "¿Cómo se dice 'uno' en inglés?", options: ["Two", "Three", "One", "Four"], answer: 2 },
  { id: "ing-pb-5", category: "ingles", level: "primaria-baja", prompt: "¿Cómo se saluda en inglés?", options: ["Bonjour", "Hello", "Ciao", "Hallo"], answer: 1 },
  { id: "ing-pb-6", category: "ingles", level: "primaria-baja", prompt: "¿Cómo se dice 'agua' en inglés?", options: ["Milk", "Water", "Juice", "Wine"], answer: 1 },
  { id: "ing-pb-7", category: "ingles", level: "primaria-baja", prompt: "¿Cómo se dice 'casa' en inglés?", options: ["Hose", "House", "Horse", "Hour"], answer: 1 },
  { id: "ing-pb-8", category: "ingles", level: "primaria-baja", prompt: "¿Cómo se dice 'amigo' en inglés?", options: ["Father", "Friend", "Brother", "Family"], answer: 1 },

  // -- Acertijos (1°-2°) - simples, lógicos
  { id: "ace-pb-1", category: "acertijos", level: "primaria-baja", prompt: "Si en una pieza hay 5 mosquitos y matás 2, ¿cuántos mosquitos quedan en la pieza?", options: ["3", "2", "5", "0"], answer: 2, hint: "Los muertos siguen estando ahí." },
  { id: "ace-pb-2", category: "acertijos", level: "primaria-baja", prompt: "¿Qué pesa más: 1 kilo de plumas o 1 kilo de hierro?", options: ["Las plumas", "El hierro", "Pesan lo mismo", "El aire"], answer: 2, hint: "Mirá bien la pregunta." },
  { id: "ace-pb-3", category: "acertijos", level: "primaria-baja", prompt: "Tengo cuatro patas pero no camino. ¿Qué soy?", options: ["Un perro", "Una mesa", "Un caballo", "Una hormiga"], answer: 1 },
  { id: "ace-pb-4", category: "acertijos", level: "primaria-baja", prompt: "Cuanto más le sacás, más grande se vuelve. ¿Qué es?", options: ["Una pelota", "Un agujero", "Un globo", "Una galleta"], answer: 1 },
  { id: "ace-pb-5", category: "acertijos", level: "primaria-baja", prompt: "Salgo de noche, desaparezco de día y no soy el sol. ¿Qué soy?", options: ["La lluvia", "El viento", "La luna", "Un fantasma"], answer: 2 },
  { id: "ace-pb-6", category: "acertijos", level: "primaria-baja", prompt: "¿En qué mes hay 28 días?", options: ["Solo febrero", "En todos", "Solo enero", "Ninguno"], answer: 1, hint: "Todos los meses tienen 28 días... y algunos más." },

  // ============================================================
  // PRIMARIA 5° y 6° grado  (Dante, 10 años, 5° grado)
  // ============================================================

  // -- Matemática (5°-6°)
  { id: "mat-pa-1", category: "matematica", level: "primaria-alta", prompt: "¿Cuánto es 12 × 8?", options: ["86", "92", "96", "108"], answer: 2 },
  { id: "mat-pa-2", category: "matematica", level: "primaria-alta", prompt: "¿Cuánto es 144 ÷ 12?", options: ["10", "11", "12", "13"], answer: 2 },
  { id: "mat-pa-3", category: "matematica", level: "primaria-alta", prompt: "El Mundial 2026 tiene 48 equipos en 12 grupos. ¿Cuántos equipos por grupo?", options: ["3", "4", "5", "6"], answer: 1 },
  { id: "mat-pa-4", category: "matematica", level: "primaria-alta", prompt: "¿Cuánto es 7 × 9?", options: ["56", "63", "64", "72"], answer: 1 },
  { id: "mat-pa-5", category: "matematica", level: "primaria-alta", prompt: "¿Cuánto es 25% de 200?", options: ["25", "40", "50", "75"], answer: 2 },
  { id: "mat-pa-6", category: "matematica", level: "primaria-alta", prompt: "¿Cuánto es 3/4 de 100?", options: ["50", "60", "75", "80"], answer: 2 },
  { id: "mat-pa-7", category: "matematica", level: "primaria-alta", prompt: "Si gano 3, empato 1 y pierdo 0, ¿cuántos puntos sumo? (G=3, E=1)", options: ["8", "9", "10", "11"], answer: 2 },
  { id: "mat-pa-8", category: "matematica", level: "primaria-alta", prompt: "El doble de 17 es...", options: ["32", "34", "36", "38"], answer: 1 },
  { id: "mat-pa-9", category: "matematica", level: "primaria-alta", prompt: "¿Cuántos minutos hay en 2 horas y media?", options: ["120", "130", "150", "160"], answer: 2 },
  { id: "mat-pa-10", category: "matematica", level: "primaria-alta", prompt: "Un álbum tiene 240 figuritas. Tengo 180. ¿Cuántas me faltan?", options: ["50", "60", "70", "80"], answer: 1 },

  // -- Lengua (5°-6°)
  { id: "len-pa-1", category: "lengua", level: "primaria-alta", prompt: "¿Cuál de estas palabras es esdrújula?", options: ["camión", "papel", "pájaro", "rincón"], answer: 2 },
  { id: "len-pa-2", category: "lengua", level: "primaria-alta", prompt: "En 'Messi metió un gol', el sujeto es...", options: ["metió", "Messi", "un gol", "gol"], answer: 1 },
  { id: "len-pa-3", category: "lengua", level: "primaria-alta", prompt: "¿Cuántas letras tiene el abecedario español (con la ñ)?", options: ["26", "27", "28", "29"], answer: 1 },
  { id: "len-pa-4", category: "lengua", level: "primaria-alta", prompt: "Sinónimo de 'rápido' es...", options: ["lento", "veloz", "alto", "fuerte"], answer: 1 },
  { id: "len-pa-5", category: "lengua", level: "primaria-alta", prompt: "¿Cuál es un verbo?", options: ["azul", "correr", "feliz", "mesa"], answer: 1 },
  { id: "len-pa-6", category: "lengua", level: "primaria-alta", prompt: "¿Cómo se llama una palabra que se lee igual al derecho y al revés (ej: 'oso')?", options: ["sinónimo", "palíndromo", "antónimo", "diptongo"], answer: 1 },
  { id: "len-pa-7", category: "lengua", level: "primaria-alta", prompt: "El plural de 'lápiz' es...", options: ["lápizes", "lápizs", "lápices", "lápiz"], answer: 2 },
  { id: "len-pa-8", category: "lengua", level: "primaria-alta", prompt: "¿Cuál palabra está MAL escrita?", options: ["jirafa", "vaca", "halla", "yendo"], answer: 2, hint: "Una de ellas confunde 'haya' con 'halla'." },
  { id: "len-pa-9", category: "lengua", level: "primaria-alta", prompt: "Los signos ¡! se llaman...", options: ["interrogación", "exclamación", "comillas", "puntos suspensivos"], answer: 1 },
  { id: "len-pa-10", category: "lengua", level: "primaria-alta", prompt: "Diminutivo de 'perro' es...", options: ["perrito", "perrón", "perroso", "perrazo"], answer: 0 },

  // -- Historia (5°-6°)
  { id: "his-pa-1", category: "historia", level: "primaria-alta", prompt: "¿En qué año se declaró la Independencia Argentina?", options: ["1810", "1816", "1820", "1853"], answer: 1 },
  { id: "his-pa-2", category: "historia", level: "primaria-alta", prompt: "¿En qué ciudad se firmó la Independencia Argentina?", options: ["Buenos Aires", "Córdoba", "Tucumán", "Salta"], answer: 2 },
  { id: "his-pa-3", category: "historia", level: "primaria-alta", prompt: "¿Quién cruzó los Andes para liberar Chile y Perú?", options: ["Belgrano", "San Martín", "Rivadavia", "Moreno"], answer: 1 },
  { id: "his-pa-4", category: "historia", level: "primaria-alta", prompt: "¿En qué año llegó Colón a América?", options: ["1492", "1500", "1810", "1810"], answer: 0 },
  { id: "his-pa-5", category: "historia", level: "primaria-alta", prompt: "¿Qué imperio dominaba la zona del actual Perú antes de los españoles?", options: ["Inca", "Azteca", "Maya", "Romano"], answer: 0 },
  { id: "his-pa-6", category: "historia", level: "primaria-alta", prompt: "¿Qué imperio estaba en el actual México antes de la conquista?", options: ["Inca", "Azteca", "Egipcio", "Persa"], answer: 1 },
  { id: "his-pa-7", category: "historia", level: "primaria-alta", prompt: "¿Cuál fue el primer gobierno patrio argentino?", options: ["La Primera Junta", "El Triunvirato", "El Directorio", "El Cabildo"], answer: 0 },
  { id: "his-pa-8", category: "historia", level: "primaria-alta", prompt: "¿Quién es conocido como el padre del aula (Día del Maestro)?", options: ["Belgrano", "Sarmiento", "Roca", "Mitre"], answer: 1 },

  // -- Geografía (5°-6°)
  { id: "geo-pa-1", category: "geografia", level: "primaria-alta", prompt: "¿Cuál es la capital de España?", options: ["Barcelona", "Sevilla", "Madrid", "Valencia"], answer: 2 },
  { id: "geo-pa-2", category: "geografia", level: "primaria-alta", prompt: "¿Cuál es la capital de Francia?", options: ["Lyon", "París", "Marsella", "Niza"], answer: 1 },
  { id: "geo-pa-3", category: "geografia", level: "primaria-alta", prompt: "¿En qué continente está Japón?", options: ["África", "Europa", "Asia", "Oceanía"], answer: 2 },
  { id: "geo-pa-4", category: "geografia", level: "primaria-alta", prompt: "¿Cuál es la capital de Alemania?", options: ["Múnich", "Hamburgo", "Berlín", "Fráncfort"], answer: 2 },
  { id: "geo-pa-5", category: "geografia", level: "primaria-alta", prompt: "¿Cuál es la capital de Colombia?", options: ["Medellín", "Cali", "Bogotá", "Cartagena"], answer: 2 },
  { id: "geo-pa-6", category: "geografia", level: "primaria-alta", prompt: "¿Cuál es la capital de Australia?", options: ["Sídney", "Melbourne", "Canberra", "Perth"], answer: 2, hint: "No es la ciudad más grande." },
  { id: "geo-pa-7", category: "geografia", level: "primaria-alta", prompt: "¿Qué océano separa Argentina de África?", options: ["Pacífico", "Atlántico", "Índico", "Ártico"], answer: 1 },
  { id: "geo-pa-8", category: "geografia", level: "primaria-alta", prompt: "¿Cuál es el país más grande de África?", options: ["Marruecos", "Argelia", "Nigeria", "Egipto"], answer: 1 },
  { id: "geo-pa-9", category: "geografia", level: "primaria-alta", prompt: "¿Cuál es el río más largo de Argentina?", options: ["Río Paraná", "Río de la Plata", "Río Salado", "Río Colorado"], answer: 0 },
  { id: "geo-pa-10", category: "geografia", level: "primaria-alta", prompt: "¿Cuántas provincias tiene Argentina?", options: ["20", "22", "23", "24"], answer: 2 },

  // -- Cultura (5°-6°)
  { id: "cul-pa-1", category: "cultura", level: "primaria-alta", prompt: "¿Quién pintó la Mona Lisa?", options: ["Picasso", "Van Gogh", "Leonardo da Vinci", "Miguel Ángel"], answer: 2 },
  { id: "cul-pa-2", category: "cultura", level: "primaria-alta", prompt: "¿Quién creó a Mafalda?", options: ["Quino", "Fontanarrosa", "Maitena", "Liniers"], answer: 0 },
  { id: "cul-pa-3", category: "cultura", level: "primaria-alta", prompt: "¿Qué número romano es la X?", options: ["5", "10", "50", "100"], answer: 1 },
  { id: "cul-pa-4", category: "cultura", level: "primaria-alta", prompt: "¿Cuál es el océano más grande?", options: ["Atlántico", "Pacífico", "Índico", "Ártico"], answer: 1 },
  { id: "cul-pa-5", category: "cultura", level: "primaria-alta", prompt: "¿Quién escribió 'El Principito'?", options: ["Saint-Exupéry", "Cervantes", "Borges", "Verne"], answer: 0 },
  { id: "cul-pa-6", category: "cultura", level: "primaria-alta", prompt: "¿Cuántas obras de arte se llaman 'maravillas del mundo moderno'?", options: ["5", "6", "7", "8"], answer: 2 },
  { id: "cul-pa-7", category: "cultura", level: "primaria-alta", prompt: "¿Qué instrumento toca un baterista?", options: ["Guitarra", "Piano", "Batería", "Trompeta"], answer: 2 },
  { id: "cul-pa-8", category: "cultura", level: "primaria-alta", prompt: "El tango es una música típica de...", options: ["Brasil", "Argentina y Uruguay", "España", "Cuba"], answer: 1 },

  // -- Deporte (5°-6°)
  { id: "dep-pa-1", category: "deporte", level: "primaria-alta", prompt: "¿Cuántos mundiales ganó Argentina?", options: ["1", "2", "3", "4"], answer: 2 },
  { id: "dep-pa-2", category: "deporte", level: "primaria-alta", prompt: "¿En qué año ganó Argentina su primer Mundial?", options: ["1978", "1986", "2022", "1974"], answer: 0 },
  { id: "dep-pa-3", category: "deporte", level: "primaria-alta", prompt: "¿Cuál es el país con más mundiales?", options: ["Argentina", "Brasil", "Alemania", "Italia"], answer: 1 },
  { id: "dep-pa-4", category: "deporte", level: "primaria-alta", prompt: "¿En qué país se jugó el primer Mundial en 1930?", options: ["Argentina", "Brasil", "Uruguay", "Italia"], answer: 2 },
  { id: "dep-pa-5", category: "deporte", level: "primaria-alta", prompt: "¿Cómo se llama el equipo argentino de rugby?", options: ["Los Cóndores", "Los Pumas", "Los Leones", "Las Águilas"], answer: 1 },
  { id: "dep-pa-6", category: "deporte", level: "primaria-alta", prompt: "¿En qué deporte se destacaba Manu Ginóbili?", options: ["Tenis", "Básquet", "Fútbol", "Vóley"], answer: 1 },
  { id: "dep-pa-7", category: "deporte", level: "primaria-alta", prompt: "¿Cuántos jugadores juegan al vóley en cancha por equipo?", options: ["5", "6", "7", "11"], answer: 1 },
  { id: "dep-pa-8", category: "deporte", level: "primaria-alta", prompt: "¿Cuál de estos NO es anfitrión del Mundial 2026?", options: ["Estados Unidos", "Canadá", "Brasil", "México"], answer: 2 },
  { id: "dep-pa-9", category: "deporte", level: "primaria-alta", prompt: "¿Cuántos goles hizo Messi en el Mundial 2022?", options: ["5", "6", "7", "8"], answer: 2 },
  { id: "dep-pa-10", category: "deporte", level: "primaria-alta", prompt: "🏟️ ¿Cuántas ciudades sedes tiene el Mundial 2026?", options: ["12", "14", "16", "20"], answer: 2, hint: "11 en USA, 3 en México, 2 en Canadá." },
  { id: "dep-pa-11", category: "deporte", level: "primaria-alta", prompt: "🏆 ¿En qué estadio se juega la final del Mundial 2026?", options: ["Maracaná (Brasil)", "MetLife Stadium (New Jersey)", "Azteca (México)", "SoFi (Los Ángeles)"], answer: 1 },
  { id: "dep-pa-12", category: "deporte", level: "primaria-alta", prompt: "🧤 ¿A qué jugador atajó Dibu Martínez el último penal en la final del Mundial 2022?", options: ["Mbappé", "Coman", "Tchouaméni", "Aurélien"], answer: 2, hint: "El penal que le dio la copa a Argentina." },
  { id: "dep-pa-13", category: "deporte", level: "primaria-alta", prompt: "🥇 ¿Quién ganó el Balón de Oro del Mundial 2022?", options: ["Mbappé", "Messi", "Modrić", "Dibu Martínez"], answer: 1 },
  { id: "dep-pa-14", category: "deporte", level: "primaria-alta", prompt: "📅 ¿En qué mes empieza el Mundial 2026?", options: ["Abril", "Junio", "Septiembre", "Noviembre"], answer: 1, hint: "Comienza el 11 de junio." },
  { id: "dep-pa-15", category: "deporte", level: "primaria-alta", prompt: "🇲🇽 ¿En qué estadio mexicano se juega el partido inaugural del Mundial 2026?", options: ["Azteca", "Akron", "BBVA Bancomer", "Jalisco"], answer: 0, hint: "Es el mismo estadio donde Maradona hizo el 'Barrilete cósmico'." },
  { id: "dep-pa-16", category: "deporte", level: "primaria-alta", prompt: "🇺🇾 ¿Quién hizo el primer gol de la historia de los Mundiales (1930)?", options: ["Un argentino", "Un uruguayo", "Un francés", "Un brasileño"], answer: 2, hint: "Lucien Laurent, de Francia." },
  { id: "dep-pa-17", category: "deporte", level: "primaria-alta", prompt: "⚽ Argentina ganó la última vez antes de 2022 en...", options: ["México 86", "Italia 90", "Francia 98", "Brasil 2014"], answer: 0 },
  { id: "dep-pa-18", category: "deporte", level: "primaria-alta", prompt: "🐐 ¿En qué club juega Messi en 2026?", options: ["Barcelona", "PSG", "Inter Miami", "Newell's"], answer: 2 },
  { id: "dep-pa-19", category: "deporte", level: "primaria-alta", prompt: "🦌 Los nombres de las 3 mascotas del Mundial 2026 son...", options: ["Zayu, Maple y Clutch", "Pibe, Goleador y Pelusa", "Naranjito, Striker y Zakumi", "Footix, Goleo y Fuleco"], answer: 0, hint: "Zayu (jaguar 🇲🇽), Maple (alce 🇨🇦), Clutch (águila 🇺🇸)." },
  { id: "dep-pa-20", category: "deporte", level: "primaria-alta", prompt: "📋 ¿Cuántos jugadores puede llevar cada selección al Mundial 2026?", options: ["18", "23", "26", "30"], answer: 2, hint: "Desde Qatar 2022 son 26." },

  // -- Ciencias (5°-6°)
  { id: "cie-pa-1", category: "ciencias", level: "primaria-alta", prompt: "¿Cuál es el planeta más cercano al Sol?", options: ["Venus", "Mercurio", "Tierra", "Marte"], answer: 1 },
  { id: "cie-pa-2", category: "ciencias", level: "primaria-alta", prompt: "¿Cuál es el planeta más grande del sistema solar?", options: ["Tierra", "Saturno", "Júpiter", "Neptuno"], answer: 2 },
  { id: "cie-pa-3", category: "ciencias", level: "primaria-alta", prompt: "¿Cómo se llama el proceso por el cual las plantas hacen su alimento?", options: ["respiración", "fotosíntesis", "germinación", "polinización"], answer: 1 },
  { id: "cie-pa-4", category: "ciencias", level: "primaria-alta", prompt: "¿Cuáles son los estados del agua?", options: ["caliente y frío", "sólido, líquido y gaseoso", "dulce y salada", "rápido y lento"], answer: 1 },
  { id: "cie-pa-5", category: "ciencias", level: "primaria-alta", prompt: "¿Cuál es el mamífero más grande del mundo?", options: ["Elefante", "Ballena azul", "Tiburón", "Jirafa"], answer: 1, hint: "Vive en el océano." },
  { id: "cie-pa-6", category: "ciencias", level: "primaria-alta", prompt: "¿Cuántos huesos tiene aproximadamente el cuerpo de un adulto?", options: ["106", "156", "206", "306"], answer: 2 },
  { id: "cie-pa-7", category: "ciencias", level: "primaria-alta", prompt: "¿Qué gas necesitamos para respirar?", options: ["Hidrógeno", "Oxígeno", "Nitrógeno", "Helio"], answer: 1 },
  { id: "cie-pa-8", category: "ciencias", level: "primaria-alta", prompt: "¿Qué órgano bombea la sangre?", options: ["Pulmón", "Hígado", "Corazón", "Cerebro"], answer: 2 },
  { id: "cie-pa-9", category: "ciencias", level: "primaria-alta", prompt: "¿Cuántos planetas tiene el sistema solar?", options: ["7", "8", "9", "10"], answer: 1 },

  // -- Inglés (5°-6°)
  { id: "ing-pa-1", category: "ingles", level: "primaria-alta", prompt: "¿Cómo se dice 'cena' en inglés (Estados Unidos)?", options: ["Breakfast", "Lunch", "Dinner", "Snack"], answer: 2, hint: "Lunch = almuerzo, breakfast = desayuno." },
  { id: "ing-pa-2", category: "ingles", level: "primaria-alta", prompt: "¿Cómo se dice 'arquero' (fútbol) en inglés?", options: ["Striker", "Goalkeeper", "Defender", "Coach"], answer: 1 },
  { id: "ing-pa-3", category: "ingles", level: "primaria-alta", prompt: "¿Cómo se dice 'partido' en inglés?", options: ["Game", "Match", "Cup", "Set"], answer: 1 },
  { id: "ing-pa-4", category: "ingles", level: "primaria-alta", prompt: "¿Cómo se dice 'campo' (de fútbol) en inglés?", options: ["Court", "Field", "Track", "Yard"], answer: 1 },
  { id: "ing-pa-5", category: "ingles", level: "primaria-alta", prompt: "¿Cómo se dice 'ganar' en inglés?", options: ["Lose", "Tie", "Win", "Play"], answer: 2 },
  { id: "ing-pa-6", category: "ingles", level: "primaria-alta", prompt: "¿Qué significa 'World Cup'?", options: ["Copa del mundo", "Copa de oro", "Liga mundial", "Estadio mundial"], answer: 0 },
  { id: "ing-pa-7", category: "ingles", level: "primaria-alta", prompt: "¿Qué significa 'team'?", options: ["Tiempo", "Equipo", "Tema", "Tienda"], answer: 1 },
  { id: "ing-pa-8", category: "ingles", level: "primaria-alta", prompt: "¿Cómo se dice 'pierna' en inglés?", options: ["Arm", "Foot", "Leg", "Hand"], answer: 2 },
  { id: "ing-pa-9", category: "ingles", level: "primaria-alta", prompt: "¿Qué significa 'goal'?", options: ["Tarjeta", "Gol", "Falta", "Penal"], answer: 1 },
  { id: "ing-pa-10", category: "ingles", level: "primaria-alta", prompt: "¿Qué hora es: 'It's seven o'clock'?", options: ["Las 5", "Las 7", "Las 11", "Las 12"], answer: 1 },

  // -- Acertijos (5°-6°) - pensamiento lateral
  { id: "ace-pa-1", category: "acertijos", level: "primaria-alta", prompt: "Un pastor tiene 17 ovejas. Todas menos 9 se escapan. ¿Cuántas quedan?", options: ["8", "9", "17", "0"], answer: 1, hint: "'Todas menos 9' = quedan 9." },
  { id: "ace-pa-2", category: "acertijos", level: "primaria-alta", prompt: "Una madre tiene 4 hijos varones y cada uno tiene una hermana. ¿Cuántos hijos tiene la madre en total?", options: ["4", "5", "8", "9"], answer: 1, hint: "Todos los varones comparten la misma hermana." },
  { id: "ace-pa-3", category: "acertijos", level: "primaria-alta", prompt: "Si un avión se estrella justo en la frontera entre Argentina y Uruguay, ¿dónde entierran a los sobrevivientes?", options: ["En Argentina", "En Uruguay", "En ambos", "No se entierran"], answer: 3, hint: "¿Sobrevivientes... muertos?" },
  { id: "ace-pa-4", category: "acertijos", level: "primaria-alta", prompt: "Antes de que se descubriera el monte Everest, ¿cuál era la montaña más alta del mundo?", options: ["El Aconcagua", "El K2", "El Everest", "El Kilimanjaro"], answer: 2, hint: "El Everest siempre fue el más alto, aunque no lo supieran." },
  { id: "ace-pa-5", category: "acertijos", level: "primaria-alta", prompt: "Tengo ciudades pero no casas, ríos pero sin agua, bosques pero sin árboles. ¿Qué soy?", options: ["Un sueño", "Un mapa", "Un libro", "Una pintura"], answer: 1 },
  { id: "ace-pa-6", category: "acertijos", level: "primaria-alta", prompt: "Voy y vuelvo todo el tiempo pero nunca me muevo. ¿Qué soy?", options: ["El reloj", "El camino", "La pelota", "El viento"], answer: 1 },
  { id: "ace-pa-7", category: "acertijos", level: "primaria-alta", prompt: "Si dos personas tardan 2 horas en pintar una pared, ¿cuánto tardan 4 personas (mismo ritmo)?", options: ["30 minutos", "1 hora", "2 horas", "4 horas"], answer: 1 },
  { id: "ace-pa-8", category: "acertijos", level: "primaria-alta", prompt: "Lo tiene tu hermano y tu hermana, también tu papá y tu mamá. ¿Qué es?", options: ["La nariz", "El apellido", "Los ojos", "El nombre"], answer: 1 },
  { id: "ace-pa-9", category: "acertijos", level: "primaria-alta", prompt: "Pesa 1 kg pero flota. ¿Qué es?", options: ["1 kg de hierro", "1 kg de plumas (en una bolsa de aire)", "Un globo con 1 kg de helio", "Un trozo de madera de 1 kg"], answer: 3, hint: "Necesita ser menos denso que el agua." },

  // ============================================================
  // PRIMARIA 3° y 4° grado - sembrado (3 por categoría)
  // ============================================================
  { id: "mat-pm-1", category: "matematica", level: "primaria-media", prompt: "¿Cuánto es 8 × 7?", options: ["54", "56", "63", "64"], answer: 1 },
  { id: "mat-pm-2", category: "matematica", level: "primaria-media", prompt: "¿Cuánto es 45 ÷ 9?", options: ["3", "4", "5", "6"], answer: 2 },
  { id: "mat-pm-3", category: "matematica", level: "primaria-media", prompt: "Un partido empieza 16:00 y dura 1 h 45 min. ¿Cuándo termina?", options: ["17:30", "17:45", "18:00", "18:15"], answer: 1 },
  { id: "len-pm-1", category: "lengua", level: "primaria-media", prompt: "¿Cuántas sílabas tiene 'fútbol'?", options: ["1", "2", "3", "4"], answer: 1 },
  { id: "len-pm-2", category: "lengua", level: "primaria-media", prompt: "Sinónimo de 'feliz' es...", options: ["triste", "alegre", "lento", "alto"], answer: 1 },
  { id: "len-pm-3", category: "lengua", level: "primaria-media", prompt: "¿Cuál es un adjetivo?", options: ["correr", "rápido", "mesa", "ayer"], answer: 1 },
  { id: "his-pm-1", category: "historia", level: "primaria-media", prompt: "¿Qué se festeja el 20 de junio?", options: ["Independencia", "Día de la Bandera", "Día del Maestro", "Día del Niño"], answer: 1 },
  { id: "his-pm-2", category: "historia", level: "primaria-media", prompt: "¿Quién fue el primer presidente argentino?", options: ["Sarmiento", "Mitre", "Rivadavia", "Belgrano"], answer: 2 },
  { id: "his-pm-3", category: "historia", level: "primaria-media", prompt: "¿De qué país se independizó Argentina en 1816?", options: ["Francia", "Portugal", "España", "Inglaterra"], answer: 2 },
  { id: "geo-pm-1", category: "geografia", level: "primaria-media", prompt: "¿En qué provincia está el Glaciar Perito Moreno?", options: ["Chubut", "Santa Cruz", "Tierra del Fuego", "Río Negro"], answer: 1 },
  { id: "geo-pm-2", category: "geografia", level: "primaria-media", prompt: "¿Cuál es la cordillera que separa Argentina de Chile?", options: ["Los Andes", "Los Pirineos", "Los Alpes", "Los Apalaches"], answer: 0 },
  { id: "geo-pm-3", category: "geografia", level: "primaria-media", prompt: "¿Cuántos continentes hay?", options: ["5", "6", "7", "8"], answer: 1, hint: "Depende del criterio, pero el más usado es 6." },
  { id: "cul-pm-1", category: "cultura", level: "primaria-media", prompt: "¿Quién compuso el Himno Nacional Argentino?", options: ["López y Planes (letra) / Parera (música)", "Carlos Gardel", "Mercedes Sosa", "Beethoven"], answer: 0 },
  { id: "cul-pm-2", category: "cultura", level: "primaria-media", prompt: "¿Qué deporte juegan los All Blacks?", options: ["Fútbol", "Rugby", "Cricket", "Hockey"], answer: 1 },
  { id: "cul-pm-3", category: "cultura", level: "primaria-media", prompt: "¿Quién es el creador del personaje Harry Potter?", options: ["J.R.R. Tolkien", "J.K. Rowling", "Roald Dahl", "Stephen King"], answer: 1 },
  { id: "dep-pm-1", category: "deporte", level: "primaria-media", prompt: "¿Cuánto duran los dos tiempos de un partido de fútbol?", options: ["80 min", "90 min", "100 min", "120 min"], answer: 1 },
  { id: "dep-pm-2", category: "deporte", level: "primaria-media", prompt: "¿Cuántos sets tiene como máximo un partido de tenis de Grand Slam masculino?", options: ["3", "5", "7", "9"], answer: 1 },
  { id: "dep-pm-3", category: "deporte", level: "primaria-media", prompt: "¿En qué deporte se juega en una cancha de 100 yardas?", options: ["Fútbol", "Fútbol americano", "Béisbol", "Hockey"], answer: 1 },
  { id: "cie-pm-1", category: "ciencias", level: "primaria-media", prompt: "¿Cuál es el planeta del anillo más conocido?", options: ["Júpiter", "Saturno", "Urano", "Neptuno"], answer: 1 },
  { id: "cie-pm-2", category: "ciencias", level: "primaria-media", prompt: "¿Qué animal es un mamífero?", options: ["Tiburón", "Cocodrilo", "Delfín", "Pingüino"], answer: 2 },
  { id: "cie-pm-3", category: "ciencias", level: "primaria-media", prompt: "¿Qué nos protege del Sol en la atmósfera?", options: ["Nitrógeno", "Capa de ozono", "Dióxido de carbono", "Nubes"], answer: 1 },
  { id: "ing-pm-1", category: "ingles", level: "primaria-media", prompt: "¿Cómo se dice 'lunes' en inglés?", options: ["Sunday", "Monday", "Friday", "Tuesday"], answer: 1 },
  { id: "ing-pm-2", category: "ingles", level: "primaria-media", prompt: "¿Cómo se dice 'manzana' en inglés?", options: ["Orange", "Apple", "Banana", "Grape"], answer: 1 },
  { id: "ing-pm-3", category: "ingles", level: "primaria-media", prompt: "¿Cómo se dice 'amarillo' en inglés?", options: ["Yellow", "Blue", "Green", "White"], answer: 0 },
  { id: "ace-pm-1", category: "acertijos", level: "primaria-media", prompt: "Lo que es mío, lo usan más los demás. ¿Qué es?", options: ["mi voz", "mi sombra", "mi nombre", "mi reloj"], answer: 2 },
  { id: "ace-pm-2", category: "acertijos", level: "primaria-media", prompt: "Si subís una escalera de 10 escalones, ¿cuántos escalones bajás?", options: ["10", "9", "0", "11"], answer: 0, hint: "Si subís, ¡no bajás ninguno!" },
  { id: "ace-pm-3", category: "acertijos", level: "primaria-media", prompt: "Cuanto más seca, más se moja. ¿Qué es?", options: ["la tierra", "la toalla", "la esponja", "la rama"], answer: 1 },

  // ============================================================
  // SECUNDARIA 1°-3° año - sembrado
  // ============================================================
  { id: "mat-sb-1", category: "matematica", level: "secundaria-baja", prompt: "¿Cuánto es 15² (15 al cuadrado)?", options: ["205", "225", "235", "245"], answer: 1 },
  { id: "mat-sb-2", category: "matematica", level: "secundaria-baja", prompt: "¿Cuánto es la raíz cuadrada de 144?", options: ["10", "11", "12", "13"], answer: 2 },
  { id: "mat-sb-3", category: "matematica", level: "secundaria-baja", prompt: "Si x + 7 = 15, ¿cuánto vale x?", options: ["6", "7", "8", "9"], answer: 2 },
  { id: "len-sb-1", category: "lengua", level: "secundaria-baja", prompt: "El sujeto tácito es aquel que...", options: ["aparece al principio", "no está escrito pero se entiende", "siempre es un pronombre", "tiene un verbo"], answer: 1 },
  { id: "len-sb-2", category: "lengua", level: "secundaria-baja", prompt: "¿Cuál es el género de 'El Quijote'?", options: ["Novela", "Cuento", "Poema", "Obra de teatro"], answer: 0 },
  { id: "len-sb-3", category: "lengua", level: "secundaria-baja", prompt: "Un verso es...", options: ["una línea de un poema", "una palabra rara", "una rima", "un párrafo"], answer: 0 },
  { id: "his-sb-1", category: "historia", level: "secundaria-baja", prompt: "¿En qué año se produjo la Revolución Francesa?", options: ["1776", "1789", "1810", "1815"], answer: 1 },
  { id: "his-sb-2", category: "historia", level: "secundaria-baja", prompt: "¿En qué año cayó el Muro de Berlín?", options: ["1969", "1979", "1989", "1999"], answer: 2 },
  { id: "his-sb-3", category: "historia", level: "secundaria-baja", prompt: "¿En qué año se recuperó la democracia en Argentina?", options: ["1976", "1982", "1983", "1989"], answer: 2 },
  { id: "geo-sb-1", category: "geografia", level: "secundaria-baja", prompt: "¿Cuál es el río más caudaloso del mundo?", options: ["Nilo", "Amazonas", "Misisipi", "Yangtsé"], answer: 1 },
  { id: "geo-sb-2", category: "geografia", level: "secundaria-baja", prompt: "¿Cuál es el país más poblado del mundo?", options: ["China", "India", "Estados Unidos", "Indonesia"], answer: 1, hint: "India superó a China en 2023." },
  { id: "geo-sb-3", category: "geografia", level: "secundaria-baja", prompt: "¿En qué continente está el desierto del Sahara?", options: ["Asia", "África", "Oceanía", "América"], answer: 1 },
  { id: "cul-sb-1", category: "cultura", level: "secundaria-baja", prompt: "¿Quién escribió 'Cien Años de Soledad'?", options: ["Borges", "García Márquez", "Cortázar", "Neruda"], answer: 1 },
  { id: "cul-sb-2", category: "cultura", level: "secundaria-baja", prompt: "¿Quién pintó 'La Noche Estrellada'?", options: ["Picasso", "Monet", "Van Gogh", "Dalí"], answer: 2 },
  { id: "cul-sb-3", category: "cultura", level: "secundaria-baja", prompt: "El movimiento literario al que perteneció Borges es...", options: ["Romanticismo", "Realismo mágico/Fantástico", "Surrealismo", "Naturalismo"], answer: 1 },
  { id: "dep-sb-1", category: "deporte", level: "secundaria-baja", prompt: "¿Cuántos puntos vale una triple en básquet?", options: ["1", "2", "3", "4"], answer: 2 },
  { id: "dep-sb-2", category: "deporte", level: "secundaria-baja", prompt: "¿Quién ganó 5 mundiales de F1 siendo argentino?", options: ["Reutemann", "Fangio", "Galvez", "Senna"], answer: 1 },
  { id: "dep-sb-3", category: "deporte", level: "secundaria-baja", prompt: "¿Cada cuántos años se juega el Mundial de Fútbol?", options: ["2", "3", "4", "5"], answer: 2 },
  { id: "cie-sb-1", category: "ciencias", level: "secundaria-baja", prompt: "¿Cuál es la fórmula del agua?", options: ["CO2", "H2O", "O2", "NaCl"], answer: 1 },
  { id: "cie-sb-2", category: "ciencias", level: "secundaria-baja", prompt: "¿Qué órgano produce la insulina?", options: ["Hígado", "Páncreas", "Riñón", "Estómago"], answer: 1 },
  { id: "cie-sb-3", category: "ciencias", level: "secundaria-baja", prompt: "¿Qué velocidad alcanza la luz aproximadamente?", options: ["300 km/s", "30.000 km/s", "300.000 km/s", "3.000.000 km/s"], answer: 2 },
  { id: "ing-sb-1", category: "ingles", level: "secundaria-baja", prompt: "Past simple de 'go' es...", options: ["goed", "gone", "went", "going"], answer: 2 },
  { id: "ing-sb-2", category: "ingles", level: "secundaria-baja", prompt: "¿Cómo se traduce 'I have been to London'?", options: ["Voy a Londres", "Estuve en Londres", "Estoy en Londres", "Iré a Londres"], answer: 1 },
  { id: "ing-sb-3", category: "ingles", level: "secundaria-baja", prompt: "Antónimo en inglés de 'hot' es...", options: ["warm", "cold", "wet", "dry"], answer: 1 },
  { id: "ace-sb-1", category: "acertijos", level: "secundaria-baja", prompt: "Tres personas se dividen una bolsa con 3 manzanas: cada una se lleva una y queda una en la bolsa. ¿Cómo?", options: ["Una persona se llevó la bolsa con la manzana adentro", "Imposible", "Hay 4 manzanas", "Una se la come"], answer: 0 },
  { id: "ace-sb-2", category: "acertijos", level: "secundaria-baja", prompt: "Mi padre tiene un hijo que no es mi hermano. ¿Quién es?", options: ["Mi tío", "Mi primo", "Yo mismo/a", "Mi cuñado"], answer: 2 },
  { id: "ace-sb-3", category: "acertijos", level: "secundaria-baja", prompt: "Si tres gallinas ponen tres huevos en tres días, ¿cuántos huevos ponen seis gallinas en seis días?", options: ["6", "9", "12", "18"], answer: 2, hint: "Una gallina pone 1 huevo cada 3 días." },

  // ============================================================
  // SECUNDARIA 4°-6° año - sembrado
  // ============================================================
  { id: "mat-sa-1", category: "matematica", level: "secundaria-alta", prompt: "¿Cuál es la derivada de x² ?", options: ["x", "2x", "x²", "2"], answer: 1 },
  { id: "mat-sa-2", category: "matematica", level: "secundaria-alta", prompt: "Si log₁₀(100) = ?", options: ["1", "2", "10", "100"], answer: 1 },
  { id: "mat-sa-3", category: "matematica", level: "secundaria-alta", prompt: "El número π (pi) vale aproximadamente...", options: ["2,71", "3,14", "1,61", "9,81"], answer: 1 },
  { id: "len-sa-1", category: "lengua", level: "secundaria-alta", prompt: "¿Quién escribió 'Martín Fierro'?", options: ["Sarmiento", "Hernández", "Lugones", "Borges"], answer: 1 },
  { id: "len-sa-2", category: "lengua", level: "secundaria-alta", prompt: "Una metáfora es...", options: ["una comparación con 'como'", "una comparación sin 'como'", "una rima", "una pregunta retórica"], answer: 1 },
  { id: "len-sa-3", category: "lengua", level: "secundaria-alta", prompt: "El protagonista del 'Quijote' es ayudado por su escudero llamado...", options: ["Sancho Panza", "Rocinante", "Dulcinea", "Aldonza"], answer: 0 },
  { id: "his-sa-1", category: "historia", level: "secundaria-alta", prompt: "¿En qué año terminó la Segunda Guerra Mundial?", options: ["1939", "1942", "1945", "1948"], answer: 2 },
  { id: "his-sa-2", category: "historia", level: "secundaria-alta", prompt: "¿En qué año fue la Guerra de Malvinas?", options: ["1978", "1982", "1986", "1989"], answer: 1 },
  { id: "his-sa-3", category: "historia", level: "secundaria-alta", prompt: "¿Quién fue el primer presidente democrático tras la dictadura argentina?", options: ["Menem", "Alfonsín", "Kirchner", "Frondizi"], answer: 1 },
  { id: "geo-sa-1", category: "geografia", level: "secundaria-alta", prompt: "¿Cuál es la capital de Kazajistán?", options: ["Astaná", "Bakú", "Taskent", "Bishkek"], answer: 0 },
  { id: "geo-sa-2", category: "geografia", level: "secundaria-alta", prompt: "El Estrecho de Bering separa Asia de...", options: ["África", "Europa", "América", "Oceanía"], answer: 2 },
  { id: "geo-sa-3", category: "geografia", level: "secundaria-alta", prompt: "¿Cuál es el lago navegable más alto del mundo?", options: ["Titicaca", "Victoria", "Baikal", "Tanganica"], answer: 0 },
  { id: "cul-sa-1", category: "cultura", level: "secundaria-alta", prompt: "¿Quién compuso 'Las Cuatro Estaciones'?", options: ["Mozart", "Bach", "Vivaldi", "Beethoven"], answer: 2 },
  { id: "cul-sa-2", category: "cultura", level: "secundaria-alta", prompt: "¿Quién dirigió la película 'El Padrino'?", options: ["Scorsese", "Coppola", "Tarantino", "Spielberg"], answer: 1 },
  { id: "cul-sa-3", category: "cultura", level: "secundaria-alta", prompt: "El movimiento artístico al que perteneció Pablo Picasso es...", options: ["Impresionismo", "Cubismo", "Surrealismo", "Romanticismo"], answer: 1 },
  { id: "dep-sa-1", category: "deporte", level: "secundaria-alta", prompt: "¿Quién es el máximo goleador histórico de los Mundiales?", options: ["Messi", "Ronaldo brasileño", "Klose", "Pelé"], answer: 2 },
  { id: "dep-sa-2", category: "deporte", level: "secundaria-alta", prompt: "¿En qué año se jugaron los primeros Juegos Olímpicos modernos?", options: ["1886", "1896", "1900", "1924"], answer: 1 },
  { id: "dep-sa-3", category: "deporte", level: "secundaria-alta", prompt: "¿Cuántos Grand Slam ganó Roger Federer?", options: ["18", "19", "20", "22"], answer: 2 },
  { id: "dep-sa-4", category: "deporte", level: "secundaria-alta", prompt: "🏆 ¿Quién es el máximo goleador histórico de los Mundiales?", options: ["Messi", "Pelé", "Klose", "Ronaldo brasileño"], answer: 2, hint: "Alemán, jugó 4 mundiales." },
  { id: "dep-sa-5", category: "deporte", level: "secundaria-alta", prompt: "📊 Récord de goles en una sola edición del Mundial:", options: ["Pelé (12)", "Just Fontaine (13)", "Müller (10)", "Messi (7)"], answer: 1, hint: "Francés, en Suecia 1958." },
  { id: "dep-sa-6", category: "deporte", level: "secundaria-alta", prompt: "🏟️ En el Mundial 2026 se juegan más partidos que nunca:", options: ["64", "80", "104", "128"], answer: 2, hint: "Por los 48 equipos." },
  { id: "dep-sa-7", category: "deporte", level: "secundaria-alta", prompt: "⚽ ¿Qué selección nunca ganó un Mundial a pesar de jugar 3 finales?", options: ["Suecia", "Hungría", "Países Bajos", "Croacia"], answer: 2, hint: "Naranja mecánica, finalista en 1974, 1978 y 2010." },
  { id: "cie-sa-1", category: "ciencias", level: "secundaria-alta", prompt: "¿Quién propuso la teoría de la relatividad?", options: ["Newton", "Einstein", "Galileo", "Hawking"], answer: 1 },
  { id: "cie-sa-2", category: "ciencias", level: "secundaria-alta", prompt: "El ADN se encuentra principalmente en...", options: ["el citoplasma", "el núcleo de la célula", "la membrana", "los ribosomas"], answer: 1 },
  { id: "cie-sa-3", category: "ciencias", level: "secundaria-alta", prompt: "¿Cuál es el símbolo químico del oro?", options: ["Or", "Au", "Ag", "Go"], answer: 1 },
  { id: "ing-sa-1", category: "ingles", level: "secundaria-alta", prompt: "Traducción de 'although'...", options: ["aunque", "porque", "mientras", "pero"], answer: 0 },
  { id: "ing-sa-2", category: "ingles", level: "secundaria-alta", prompt: "Past participle de 'write' es...", options: ["wrote", "writed", "written", "writing"], answer: 2 },
  { id: "ing-sa-3", category: "ingles", level: "secundaria-alta", prompt: "'If I had known, I would have called you' es un condicional...", options: ["Tipo 0", "Tipo 1", "Tipo 2", "Tipo 3"], answer: 3 },
  { id: "ace-sa-1", category: "acertijos", level: "secundaria-alta", prompt: "Un hombre vive en el piso 20. Cuando baja toma el ascensor hasta planta baja. Cuando vuelve, en días sin lluvia toma el ascensor solo hasta el piso 15 y sube por escalera. ¿Por qué?", options: ["Hace ejercicio", "Es bajito y no llega al botón 20 salvo con paraguas", "El ascensor se rompe", "Le gusta el piso 15"], answer: 1 },
  { id: "ace-sa-2", category: "acertijos", level: "secundaria-alta", prompt: "Hay un cuarto con dos puertas: una lleva a la muerte y otra a la vida. Dos guardianes: uno siempre miente y otro siempre dice la verdad. Solo podés hacer UNA pregunta. ¿Cuál hacés?", options: [
      "'¿Cuál es la puerta de la vida?'",
      "'¿Sos el mentiroso?'",
      "'¿Qué puerta diría el otro guardián que es la vida?' y elijo la opuesta",
      "'¿Cuál es la puerta de la muerte?'"
    ], answer: 2, hint: "Necesitás una pregunta que neutralice la mentira." },
  { id: "ace-sa-3", category: "acertijos", level: "secundaria-alta", prompt: "Te dan 9 bolitas iguales por fuera; una pesa un poquito más. Tenés una balanza de dos platillos. ¿En cuántas pesadas mínimas garantizás encontrar la más pesada?", options: ["1", "2", "3", "4"], answer: 1, hint: "Dividilas en tres grupos de 3." },
];

export function pickQuestions(level: Level, count = 5, categories?: Category[]): Question[] {
  const filterByCat = (q: Question) =>
    !categories || categories.length === 0 || categories.includes(q.category);

  // try the exact level first, then fall back to neighbours
  const neighbours: Level[] = [
    level,
    ...LEVEL_ORDER.filter((l) => l !== level).sort(
      (a, b) =>
        Math.abs(LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(level)) -
        Math.abs(LEVEL_ORDER.indexOf(b) - LEVEL_ORDER.indexOf(level))
    ),
  ];

  const selected: Question[] = [];
  const used = new Set<string>();
  for (const lvl of neighbours) {
    const pool = QUESTIONS.filter((q) => q.level === lvl && filterByCat(q) && !used.has(q.id));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const q of shuffled) {
      if (selected.length >= count) break;
      selected.push(q);
      used.add(q.id);
    }
    if (selected.length >= count) break;
  }
  return selected.slice(0, count);
}
