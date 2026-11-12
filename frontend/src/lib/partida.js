// lib/partida.js
// Funciones compartidas por todas las pages del juego para trabajar con la partida
// (PartidasBakery / UsuariosPorPartida) sin tener que pasar el id por la URL.
//
// La partida actual se guarda en sessionStorage cuando el anfitrión empieza la competencia
// (ver sala-espera). Así cualquier page posterior (competencia, crearPastel, horneado,
// ContadorHorno, decorarPastel...) la puede leer sin cambiar sus rutas.

// URL del servidor Express. Si lo tenés en otro lado, definí NEXT_PUBLIC_API_URL en .env.local
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const CLAVE = "partidaBakery";

// Guarda la partida que acaba de empezar + el momento de inicio (para calcular tiempo_total)
export function guardarPartida({ idPartida, idTorta, idSala }) {
  try {
    sessionStorage.setItem(
      CLAVE,
      JSON.stringify({ idPartida, idTorta, idSala, inicio: Date.now() })
    );
  } catch {
    // sessionStorage puede no estar disponible (modo privado, etc.): el juego sigue igual
  }
}

// Devuelve { idPartida, idTorta, idSala, inicio } o null si no hay partida en curso
// (por ejemplo, si alguien entra directo a una page sin pasar por las salas).
export function leerPartida() {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

// Borra la partida guardada (usalo cuando el jugador sale del juego)
export function borrarPartida() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {}
}

// Suma puntos al jugador actual en la partida actual.
// Pensado para las pages de preguntas (/competencia, /competencia3): una línea por respuesta correcta.
export async function sumarPuntos(puntos) {
  const partida = leerPartida();
  if (!partida?.idPartida) return null;
  try {
    const res = await fetch(`${API}/partida/sumar-puntos`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_partida: partida.idPartida, puntos }),
    });
    return await res.json();
  } catch {
    return null;
  }
}

// Guarda el tiempo total del jugador al terminar de decorar.
// El servidor, cuando todos terminaron, cierra la partida y calcula el ganador.
// Devuelve { ok, terminada, ganador } o null si no había partida / falló.
export async function guardarResultado() {
  const partida = leerPartida();
  if (!partida?.idPartida) return null; // jugando suelto, sin partida: no hay nada que guardar
  const tiempoTotal = Math.round((Date.now() - partida.inicio) / 1000); // en segundos
  try {
    const res = await fetch(`${API}/partida/resultado`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_partida: partida.idPartida, tiempo_total: tiempoTotal }),
    });
    return await res.json();
  } catch {
    return null;
  }
}