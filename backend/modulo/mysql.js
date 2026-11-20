// backend/modulo/mysql.js
// Módulo de conexión a MySQL. Lo importa el servidor con:
//   const { realizarQuery } = require("./modulo/mysql");
// Los datos de conexión salen del archivo .pio.env (MYSQL_HOST, MYSQL_USERNAME,
// MYSQL_PASSWORD, MYSQL_DB y, opcional, MYSQL_PORT).

const mySql = require("mysql2/promise");

const SQL_CONFIGURATION_DATA = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  port: process.env.MYSQL_PORT || 3306,
  charset: "UTF8_GENERAL_CI",
};

// Ejecuta una consulta y devuelve las filas (o el resultado del INSERT/UPDATE/DELETE).
// Los valores del usuario van siempre en `params` y se marcan con "?" en la consulta:
// así MySQL los trata como datos y no como código (evita inyección SQL).
exports.realizarQuery = async function (queryString, params = []) {
  let connection;
  try {
    // Abre una conexión nueva para esta consulta
    connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);
    const [rows] = await connection.execute(queryString, params);
    return rows;
  } catch (err) {
    console.error("Error en la consulta SQL:", err);
    throw err; // el servidor decide cómo responder (try/catch en cada ruta)
  } finally {
    // Siempre cierra la conexión, haya salido bien o mal
    if (connection && connection.end) {
      await connection.end();
    }
  }
};



const { realizarQuery } = require("./mysql");

// Tortas disponibles
const TORTAS_JUGABLES = [1, 2];

function esTortaValida(id) {
    return TORTAS_JUGABLES.includes(Number(id));
}

const PUNTOS_POR_PASO = 100;

function elegirTorta() {
    return TORTAS_JUGABLES[
        Math.floor(Math.random() * TORTAS_JUGABLES.length)
    ];
}

// Crear partida y guardar participantes
async function crearPartida(sala, idTorta) {
    const r = await realizarQuery(
        "INSERT INTO PartidasBakery (id_torta, activo, fecha_inicio) VALUES (?, 1, NOW())",
        [idTorta]
    );

    const idPartida = r.insertId;

    const competidores = sala.jugadores.slice(0, 2);

    for (let i = 0; i < competidores.length; i++) {
        const idUsuario = competidores[i].idUsuario;

        if (!idUsuario) continue;

        await realizarQuery(
            `INSERT INTO UsuariosPorPartida
            (id_partida, id_usuario, slot, puntos)
            VALUES (?, ?, ?, 0)`,
            [idPartida, idUsuario, i + 1]
        );
    }

    return idPartida;
}

// Sumar puntos por completar una etapa
async function sumarPuntos(idPartida, idUsuario, paso) {

    const columnas = {
        1: "paso1_completado",
        2: "paso2_completado",
        3: "paso3_completado"
    };

    const columna = columnas[Number(paso)];

    if (!columna) {
        throw new Error("Paso incorrecto");
    }

    const resultado = await realizarQuery(
        `UPDATE UsuariosPorPartida
        SET puntos = puntos + ?,
            ${columna} = 1
        WHERE id_partida = ?
        AND id_usuario = ?
        AND ${columna} = 0`,
        [PUNTOS_POR_PASO, idPartida, idUsuario]
    );

    if (resultado.affectedRows === 0) {

        const existe = await realizarQuery(
            `SELECT id, puntos
            FROM UsuariosPorPartida
            WHERE id_partida = ?
            AND id_usuario = ?`,
            [idPartida, idUsuario]
        );

        if (existe.length === 0) {
            throw new Error("El usuario no participa en esta partida");
        }

        return {
            sumados: 0,
            puntos: existe[0].puntos,
            repetido: true
        };
    }

    const filas = await realizarQuery(
        `SELECT puntos
        FROM UsuariosPorPartida
        WHERE id_partida = ?
        AND id_usuario = ?`,
        [idPartida, idUsuario]
    );

    return {
        sumados: PUNTOS_POR_PASO,
        puntos: filas[0].puntos,
        repetido: false
    };
}

// Cerrar partida cuando terminaron todos
async function cerrarPartida(io, sala) {

    if (!sala.idPartida || sala.cerrada) return;

    sala.cerrada = true;

    try {

        const filas = await realizarQuery(
            `SELECT id_usuario
            FROM UsuariosPorPartida
            WHERE id_partida = ?
            AND tiempo_total IS NOT NULL
            ORDER BY tiempo_total ASC, id ASC`,
            [sala.idPartida]
        );

        const idGanador = filas[0]?.id_usuario ?? null;

        // IMPORTANTE:
        // Ya no sobrescribimos los puntos.
        // Los 100 puntos de cada etapa se conservan.

        await realizarQuery(
            `UPDATE PartidasBakery
            SET activo = 0,
                id_ganador = ?,
                fecha_fin = NOW()
            WHERE id_partida = ?`,
            [idGanador, sala.idPartida]
        );

        const ganador = sala.jugadores.find(
            (j) => Number(j.idUsuario) === Number(idGanador)
        );

        io.to(sala.id).emit("partidaTerminada", {
            idPartida: sala.idPartida,
            idGanador,
            nombreGanador: ganador?.nombre ?? null
        });

    } catch (err) {
        console.error("Error cerrando la partida:", err);
    }
}

// Comprobar si todos terminaron
function intentarCerrar(io, sala) {

    if (!sala.empezada || sala.cerrada || !sala.terminaron) return;

    const activos = sala.jugadores.slice(0, 2);

    if (
        activos.length &&
        activos.every((j) => sala.terminaron.has(j.id))
    ) {
        cerrarPartida(io, sala);
    }
}

// Registrar eventos de partidas
function registrarPartidas(io, socket, salas) {

    socket.on("guardarResultado", async ({ idPartida } = {}) => {

        const sala = [...salas.values()].find(
            (s) =>
                s.idPartida &&
                Number(s.idPartida) === Number(idPartida) &&
                s.jugadores.some((j) => j.id === socket.id)
        );

        if (!sala || sala.cerrada || sala.terminaron.has(socket.id)) {
            return;
        }

        const jugador = sala.jugadores.find(
            (j) => j.id === socket.id
        );

        sala.terminaron.add(socket.id);

        const segundos = Math.round(
            (Date.now() - sala.inicioMs) / 1000
        );

        try {

            if (jugador.idUsuario) {

                await realizarQuery(
                    `UPDATE UsuariosPorPartida
                    SET tiempo_total = ?
                    WHERE id_partida = ?
                    AND id_usuario = ?`,
                    [segundos, sala.idPartida, jugador.idUsuario]
                );
            }

        } catch (err) {
            console.error("Error guardando el resultado:", err);
        }

        intentarCerrar(io, sala);
    });
}

module.exports = {
    registrarPartidas,
    crearPartida,
    elegirTorta,
    esTortaValida,
    cerrarPartida,
    intentarCerrar,
    sumarPuntos
};
