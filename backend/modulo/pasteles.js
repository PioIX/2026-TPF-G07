// Va en: backend/modulo/pasteles.js
// Guarda las tortas de cada sala y se las manda a los jugadores en el momento.
// Usa la MISMA conexión de socket.io de tu index.js y las MISMAS salas del juego:
//  - el jugador 1 (soporte izquierdo) es el primero de sala.jugadores (el anfitrión)
//  - el jugador 2 (soporte derecho) es el segundo
//  - las tortas se guardan dentro de la sala (sala.pasteles): si la sala se borra, se borran con ella
// Los eventos empiezan con "pasteles:" para no chocar con los de tus salas.

// Cuando abrís una página de tortas directo (sin haber pasado por una sala), el socket no está
// en ninguna sala del juego. Para poder probar, se usa una sala de pruebas con dos lugares.
const pruebas = { ids: [null, null], pasteles: [null, null] };

// ¿En qué sala del juego está este socket y qué lugar ocupa?
function buscarEnSalas(salasJuego, socketId) {
  for (const sala of salasJuego.values()) {
    const i = sala.jugadores.findIndex((j) => j.id === socketId);
    if (i !== -1) return { sala, slot: i < 2 ? i : -1 }; // del tercero en adelante: solo miran
  }
  return null;
}

// salasJuego = el Map "salas" de tu index.js
function registrarPasteles(io, socket, salasJuego) {
  let lugar = null; // { pasteles: [2 tortas], slot, cuarto }

  // datos = { id }: identificador del navegador, solo se usa en la sala de pruebas
  socket.on("pasteles:unirse", (datos, ack) => {
    const real = salasJuego ? buscarEnSalas(salasJuego, socket.id) : null;

    if (real) {
      real.sala.pasteles ??= [null, null];
      lugar = { pasteles: real.sala.pasteles, slot: real.slot, cuarto: real.sala.id };
    } else {
      const id = String(datos?.id || socket.id);
      let slot = pruebas.ids.indexOf(id);
      if (slot === -1) slot = pruebas.ids.indexOf(null);
      if (slot !== -1) {
        if (pruebas.ids[slot] !== id) pruebas.pasteles[slot] = null; // lugar nuevo: sin torta vieja
        pruebas.ids[slot] = id;
      }
      lugar = { pasteles: pruebas.pasteles, slot, cuarto: "pasteles:pruebas" };
    }

    socket.join(lugar.cuarto);
    ack?.({ slot: lugar.slot === -1 ? null : lugar.slot, pasteles: lugar.pasteles });
    io.to(lugar.cuarto).emit("pasteles:estado", lugar.pasteles);
  });

  // datos = { imagen: "data:image/png;base64,..." | null }   (null = borrar mi torta)
  socket.on("pasteles:guardar", (datos) => {
    if (!lugar || lugar.slot === -1 || lugar.slot === null) return;
    const imagen = datos?.imagen ?? null;
    if (imagen !== null) {
      const ok = typeof imagen === "string" && imagen.startsWith("data:image/png;base64,") && imagen.length < 8_000_000;
      if (!ok) return;
    }
    lugar.pasteles[lugar.slot] = imagen;
    io.to(lugar.cuarto).emit("pasteles:estado", lugar.pasteles);
  });
}

module.exports = { registrarPasteles };