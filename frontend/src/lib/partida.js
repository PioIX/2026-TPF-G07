// Va en: src/lib/partida.js  (REEMPLAZA la versión anterior)
import { obtenerSocket } from "@/hooks/useSocket";

const KEY = "partidaActual";

function guardar(p) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

// La llama sala-espera cuando arranca la competencia
export function guardarPartida({ idPartida, idTorta, idSala }) {
  guardar({
    idPartida: idPartida ?? null,
    idTorta: idTorta ?? null,
    idSala,
    inicio: Date.now(), // desde acá cuenta el cronómetro
    fin: null,
  });
}

export function leerPartida() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function borrarPartida() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

// La llama decorarPastel al terminar. Frena el cronómetro y avisa al servidor,
// que calcula el tiempo y, si ya terminaron todos, cierra la partida y define al ganador.
export function guardarResultado() {
  const p = leerPartida();
  if (!p) return;
  if (!p.fin) guardar({ ...p, fin: Date.now() });
  if (!p.idPartida) return; // no hay partida en la base: solo se frena el cronómetro
  try {
    obtenerSocket().emit("guardarResultado", { idPartida: p.idPartida });
  } catch {}
}