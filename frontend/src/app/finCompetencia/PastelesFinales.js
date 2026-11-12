// Va en: src/app/finCompetencia/PastelesFinales.js
// Guarda la torta de ESTE jugador y recibe las de los dos en el momento.
// Usa la MISMA conexión de socket que el resto del juego (src/hooks/useSocket.js),
// por eso el servidor sabe en qué sala estás y si sos el jugador 1 o el 2.
import { obtenerSocket } from "@/hooks/useSocket";

// Solo para pruebas (cuando abrís la página directo, sin pasar por una sala):
// un identificador que se mantiene en la pestaña.
function jugadorId() {
  try {
    let id = sessionStorage.getItem("jugadorId");
    if (!id) {
      id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem("jugadorId", id);
    }
    return id;
  } catch {
    return "anonimo";
  }
}

// ---- estado compartido por las páginas ----
let iniciado = false;
const estado = { conectado: false, pasteles: [null, null], slot: null };
const oyentes = new Set();
const pendientes = []; // cosas para mandar apenas el servidor nos ubique en la sala
const avisar = () => oyentes.forEach((f) => f({ ...estado }));

function iniciar() {
  const socket = obtenerSocket();
  if (iniciado) return socket;
  iniciado = true;

  // Pide al servidor que nos ubique (sala y soporte). Se repite si la conexión se corta y vuelve.
  const unirse = () =>
    socket.emit("pasteles:unirse", { id: jugadorId() }, (r) => {
      estado.conectado = true;
      estado.slot = r?.slot ?? null;
      if (r?.pasteles) estado.pasteles = r.pasteles;
      while (pendientes.length) pendientes.shift()();
      avisar();
    });

  socket.on("connect", unirse);
  socket.on("disconnect", () => {
    estado.conectado = false;
    avisar();
  });
  // el servidor manda las dos tortas cada vez que cambia algo
  socket.on("pasteles:estado", (pasteles) => {
    estado.pasteles = pasteles;
    avisar();
  });

  if (socket.connected) unirse(); // el socket ya estaba conectado desde la sala
  return socket;
}

// Ejecuta fn cuando el servidor ya nos ubicó (si todavía no, espera)
function cuandoUnido(fn) {
  const socket = iniciar();
  if (estado.conectado) fn(socket);
  else pendientes.push(() => fn(socket));
}

// Guarda la torta de ESTE jugador: la ven los de la sala al instante
export function guardarPastel(dataUrl) {
  if (!dataUrl) return;
  cuandoUnido((socket) => socket.emit("pasteles:guardar", { imagen: dataUrl }));
}

// Borra la torta de ESTE jugador (al empezar a decorar de nuevo)
export function borrarPastel() {
  cuandoUnido((socket) => socket.emit("pasteles:guardar", { imagen: null }));
}

// Llama a alCambiar({ conectado, pasteles: [torta1, torta2], slot }) ahora y cada vez que algo cambie.
// Devuelve una función para dejar de escuchar.
export function suscribirPasteles(alCambiar) {
  iniciar();
  oyentes.add(alCambiar);
  alCambiar({ ...estado });
  return () => oyentes.delete(alCambiar);
}