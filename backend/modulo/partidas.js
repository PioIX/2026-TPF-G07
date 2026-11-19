// Va en: backend/modulo/partidas.js  (archivo NUEVO)
// Guarda en MySQL las partidas (PartidasBakery) y el resultado de cada jugador (UsuariosPorPartida).
const { realizarQuery } = require("./mysql");

// Tortas que ya tienen receta en el front (RECETAS en crearPastel): 1 = vainilla, 2 = chocolate
const TORTAS_JUGABLES = [1, 2];

function esTortaValida(id) {
  return TORTAS_JUGABLES.includes(Number(id));
}
const PUNTOS_GANADOR = 10;
const PUNTOS_PARTICIPA = 5;

function elegirTorta() {
  return TORTAS_JUGABLES[Math.floor(Math.random() * TORTAS_JUGABLES.length)];
}

// Crea la partida y una fila por jugador (solo los 2 primeros compiten, el resto mira)
async function crearPartida(sala, idTorta) {
  const r = await realizarQuery(
    "INSERT INTO PartidasBakery (id_torta, activo, fecha_inicio) VALUES (?, 1, NOW())",
    [idTorta]
  );
  const idPartida = r.insertId;

  const competidores = sala.jugadores.slice(0, 2);
  for (let i = 0; i < competidores.length; i++) {
    const idUsuario = competidores[i].idUsuario;
    if (!idUsuario) continue; // jugador sin sesión: juega igual, pero no se guarda
    await realizarQuery(
      "INSERT INTO UsuariosPorPartida (id_partida, id_usuario, slot, puntos) VALUES (?, ?, ?, 0)",
      [idPartida, idUsuario, i + 1]
    );
  }
  return idPartida;
}

// Cierra la partida: elige ganador entre los que terminaron y reparte puntos
async function cerrarPartida(io, sala) {
  if (!sala.idPartida || sala.cerrada) return;
  sala.cerrada = true;
  try {
    const filas = await realizarQuery(
      `SELECT id_usuario FROM UsuariosPorPartida
       WHERE id_partida = ? AND tiempo_total IS NOT NULL
       ORDER BY tiempo_total ASC, id ASC`,
      [sala.idPartida]
    );
    const idGanador = filas[0]?.id_usuario ?? null;

    for (const f of filas) {
      await realizarQuery(
        "UPDATE UsuariosPorPartida SET puntos = ? WHERE id_partida = ? AND id_usuario = ?",
        [f.id_usuario === idGanador ? PUNTOS_GANADOR : PUNTOS_PARTICIPA, sala.idPartida, f.id_usuario]
      );
    }

    await realizarQuery(
      "UPDATE PartidasBakery SET activo = 0, id_ganador = ?, fecha_fin = NOW() WHERE id_partida = ?",
      [idGanador, sala.idPartida]
    );

    const ganador = sala.jugadores.find((j) => j.idUsuario === idGanador);
    io.to(sala.id).emit("partidaTerminada", {
      idPartida: sala.idPartida,
      idGanador,
      nombreGanador: ganador?.nombre ?? null,
    });
  } catch (err) {
    console.error("Error cerrando la partida:", err);
  }
}

// Si todos los jugadores que siguen en la sala ya terminaron, cierra la partida
function intentarCerrar(io, sala) {
  if (!sala.empezada || sala.cerrada || !sala.terminaron) return;
  const activos = sala.jugadores.slice(0, 2);
  if (activos.length && activos.every((j) => sala.terminaron.has(j.id))) {
    cerrarPartida(io, sala);
  }
}

function registrarPartidas(io, socket, salas) {
  // El front avisa cuando este jugador termina de decorar
  socket.on("guardarResultado", async ({ idPartida } = {}) => {
    const sala = [...salas.values()].find(
      (s) => s.idPartida && s.idPartida === idPartida && s.jugadores.some((j) => j.id === socket.id)
    );
    if (!sala || sala.cerrada || sala.terminaron.has(socket.id)) return;

    const jugador = sala.jugadores.find((j) => j.id === socket.id);
    sala.terminaron.add(socket.id);

    // El tiempo lo mide el servidor (segundos desde que empezó la competencia)
    const segundos = Math.round((Date.now() - sala.inicioMs) / 1000);

    try {
      if (jugador.idUsuario) {
        await realizarQuery(
          "UPDATE UsuariosPorPartida SET tiempo_total = ? WHERE id_partida = ? AND id_usuario = ?",
          [segundos, sala.idPartida, jugador.idUsuario]
        );
      }
    } catch (err) {
      console.error("Error guardando el resultado:", err);
    }
    intentarCerrar(io, sala);
  });
}

module.exports = { registrarPartidas, crearPartida, elegirTorta, esTortaValida, cerrarPartida, intentarCerrar };