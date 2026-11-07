// Guarda las tortas terminadas (como imagen PNG) para mostrarlas en /finCompetencia.

// Se guardan en sessionStorage: sobreviven al cambio de página y al recargar,
// y se borran al cerrar la pestaña.
const KEY = "pastelesFinales";

// Lista de 2 posiciones: [pastel del jugador 1, pastel del jugador 2]
export function leerPasteles() {
  try {
    const lista = JSON.parse(sessionStorage.getItem(KEY));
    if (Array.isArray(lista)) return [lista[0] ?? null, lista[1] ?? null];
  } catch {}
  return [null, null];
}

// A quién le toca el pastel: 1 o 2.
//  - Si la URL trae ?jugador=1 o ?jugador=2, usa ese número.
//  - Si no, usa el primer lugar libre (y si ya están los dos, empieza de nuevo en el 1).
function lugarDe(lista) {
  const n = Number(new URLSearchParams(window.location.search).get("jugador"));
  if (n === 1 || n === 2) return n - 1;
  const libre = lista.findIndex((p) => !p);
  return libre === -1 ? 0 : libre;
}

export function guardarPastel(dataUrl) {
  if (!dataUrl) return;
  try {
    const lista = leerPasteles();
    lista[lugarDe(lista)] = dataUrl;
    sessionStorage.setItem(KEY, JSON.stringify(lista));
  } catch (e) {
    console.warn("No se pudo guardar el pastel:", e);
  }
}

export function borrarPasteles() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}