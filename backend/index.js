
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Server } = require("socket.io");
const { realizarQuery } = require("./modulo/mysql");
const { registrarPasteles } = require("./modulo/pasteles");

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Configuración de CORS
// origin: true acepta el origen de cualquier compu que se conecte (con credentials no se puede usar "*").
app.use(cors());

// 2. Middleware para procesar JSON
app.use(express.json());

// 3. Middlewares de sesión
const sessionMiddleware = session({
  secret: "supersarasa",
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);

// "0.0.0.0" = escucha a todas las compus de la red, no solo a esta
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor NodeJS corriendo en http://localhost:${PORT}/`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },  
  maxHttpBufferSize: 1e7, // las tortas viajan como imagen (~1 MB); por defecto socket.io corta en 1 MB
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Salas de Petit Bakery. Cada sala tiene un identificador, un nombre, una contraseña,
// el creador, los jugadores conectados y el estado de la competencia.
// (Las tortas de cada jugador se guardan dentro de la sala: sala.pasteles, ver modulo/pasteles.js)
const salas = new Map();

function datosSala(sala) {
  return {
    id: sala.id,
    nombre: sala.nombre,
    jugadores: sala.jugadores,
    empezada: sala.empezada,
    creador: sala.creador,
  };
}

function listaSalas() {
  return Array.from(salas.values())
    .filter((sala) => !sala.empezada)
    .map((sala) => ({
      id: sala.id,
      nombre: sala.nombre,
      jugadores: sala.jugadores.length,
      minimoJugadores: 2,
    }));
}

function enviarSalas() {
  io.emit("listaSalas", listaSalas());
}

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Tortas de los jugadores (decorarPastel y finCompetencia)
  registrarPasteles(io, socket, salas);

  socket.on("pedirEstadoSala", ({ id }) => {
    const sala = salas.get(id);

    if (!sala || !socket.rooms.has(id)) {
      return socket.emit(
        "errorSala",
        "No estás conectado a esta sala o ya no existe."
      );
    }

    socket.emit("actualizarSala", datosSala(sala));
  });

  // CREAR SALA
  socket.on("crearSala", ({ nombre, contrasena, jugador }) => {
    nombre = nombre?.trim();
    jugador = jugador?.trim() || "Pastelero";

    console.log("Solicitud para crear sala:", {
      nombre,
      jugador,
      socketId: socket.id,
    });

    if (!nombre || !contrasena) {
      return socket.emit("errorSala", "Completá todos los campos.");
    }

    const existe = [...salas.values()].some(
      (sala) => sala.nombre.toLowerCase() === nombre.toLowerCase()
    );

    if (existe) {
      return socket.emit("errorSala", "Ya existe una sala con ese nombre.");
    }

    const id = nombre.toLowerCase();

    const sala = {
      id,
      nombre,
      contrasena,
      creador: socket.id,
      jugadores: [{ id: socket.id, nombre: jugador }],
      empezada: false,
    };

    salas.set(id, sala);
    socket.join(id);

    console.log("Sala creada:", sala.nombre);

    socket.emit("salaCreada", { id: sala.id, nombre: sala.nombre });
    io.to(id).emit("actualizarSala", datosSala(sala));

    enviarSalas();
  });

  // UNIRSE A UNA SALA EXISTENTE
  socket.on("unirseSala", ({ id, contrasena, jugador }) => {
    const sala = salas.get(id?.trim().toLowerCase());

    if (!sala) {
      return socket.emit("errorSala", "La sala no existe.");
    }

    if (sala.empezada) {
      return socket.emit("errorSala", "La competencia ya comenzó.");
    }

    if (sala.contrasena !== contrasena) {
      return socket.emit("errorSala", "La contraseña es incorrecta.");
    }

    if (sala.jugadores.some((p) => p.id === socket.id)) {
      return socket.emit("errorSala", "Ya estás en esta sala.");
    }

    jugador = jugador?.trim() || "Pastelero";

    sala.jugadores.push({ id: socket.id, nombre: jugador });

    socket.join(sala.id);

    io.to(sala.id).emit("actualizarSala", datosSala(sala));
    socket.emit("salaUnida", { id: sala.id, nombre: sala.nombre });

    enviarSalas();
  });

  // PEDIR EL LISTADO DE SALAS
  socket.on("pedirSalas", () => {
    socket.emit("listaSalas", listaSalas());
  });

  // EMPEZAR LA COMPETENCIA
  socket.on("empezarCompetencia", ({ id }) => {
    const sala = salas.get(id);

    if (!sala) {
      return socket.emit("errorSala", "La sala no existe.");
    }

    if (sala.creador !== socket.id) {
      return socket.emit("errorSala", "Solo quien creó la sala puede empezar.");
    }

    if (sala.jugadores.length < 2) {
      return socket.emit("errorSala", "Necesitás al menos 2 jugadores.");
    }

    sala.empezada = true;

    io.to(sala.id).emit("competenciaIniciada", {
      id: sala.id,
      nombre: sala.nombre,
    });

    enviarSalas();
  });

  socket.on("disconnect", () => {
    console.log("Disconnect:", socket.id);

    for (const [id, sala] of salas.entries()) {
      const estabaEnSala = sala.jugadores.some(
        (jugador) => jugador.id === socket.id
      );

      if (!estabaEnSala) continue;

      sala.jugadores = sala.jugadores.filter(
        (jugador) => jugador.id !== socket.id
      );

      // Si se va el creador, eliminamos la sala.
      if (sala.creador === socket.id) {
        io.to(id).emit("errorSala", "El creador salió. La sala se cerró.");

        salas.delete(id);
        continue;
      }

      io.to(id).emit("actualizarSala", datosSala(sala));
    }

    enviarSalas();
  });
});

////////////////////
// REGISTRO
////////////////////
app.get("/", (req, res) => {
  res.status(200).json({
    mensaje: "¡Backend funcionando correctamente!",
    estado: "OK",
  });
  console.log("holaaa")
});

app.post("/registro", async function (req, res) {
  try {
    const { nombre, mail, contraseña } = req.body;

    let respuesta = await realizarQuery(
      "SELECT * FROM UsuariosBakery WHERE mail = ?",
      [mail]
    );

    if (respuesta && respuesta.length > 0) {
      return res.send({ ok: false, message: "El usuario ya existe" });
    }

    let resultado = await realizarQuery(
      "INSERT INTO UsuariosBakery (nombre, mail, contraseña) VALUES (?, ?, ?)",
      [nombre, mail, contraseña || null]
    );

    res.send({
      ok: true,
      message: "Usuario Agregado",
      id_usuario: resultado.insertId,
    });
  } catch (error) {
    console.error("Error exacto en /register:", error);
    res.status(500).send({
      message: "Error en el servidor",
      error: error.message || String(error),
    });
  }
});

////////////////////////
// LOGIN:
///////////////////////

app.post("/login", async function (req, res) {
  try {
    const { mail, contraseña } = req.body;

    const respuesta = await realizarQuery(
      "SELECT * FROM UsuariosBakery WHERE mail = ? AND contraseña = ?",
      [mail, contraseña]
    );

    if (respuesta.length > 0) {
      const idDetectado = respuesta[0].id;

      req.session.user = {
        id: idDetectado,
        id_usuario: idDetectado,
        nombre: respuesta[0].nombre,
        mail: respuesta[0].mail,
      };

      res.send({
        message: "Inicio de sesion hecho",
        id: idDetectado,
        id_usuario: idDetectado,
        nombre: respuesta[0].nombre,
      });
    } else {
      res.send({ message: "Usuario inexistente" });
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error al Conectarse", error: error.message });
  }
});

///////////////////
//FUNCIONES ADMIN//
///////////////////

// AGREGAR USUARIO
// (Antes había dos rutas iguales y solo corría la primera, que ignoraba "es_admin".
//  Ahora es una sola y acepta "es_admin" o "user_administrador".)
app.post("/admin/agregar-usuario", async function (req, res) {
  try {
    const { nombre, mail, contraseña, es_admin, user_administrador } = req.body;
    const esAdmin = es_admin ?? user_administrador;

    if (!nombre || !mail || !contraseña) {
      return res
        .status(400)
        .send({ ok: false, message: "Faltan campos requeridos" });
    }

    let existe = await realizarQuery(
      "SELECT * FROM UsuariosBakery WHERE mail = ?",
      [mail]
    );

    if (existe && existe.length > 0) {
      return res.send({ ok: false, message: "El mail ya está registrado" });
    }

    let resultado = await realizarQuery(
      "INSERT INTO UsuariosBakery (nombre, mail, contraseña, user_administrador) VALUES (?, ?, ?, ?)",
      [nombre, mail, contraseña, esAdmin ? 1 : 0]
    );

    res.send({
      ok: true,
      message: "Usuario creado exitosamente",
      id_usuario: resultado.insertId,
    });
  } catch (error) {
    console.error("Error en /admin/agregar-usuario:", error);
    res.status(500).send({
      ok: false,
      message: "Error en el servidor al agregar usuario",
      error: error.message,
    });
  }
});

// OBTENER TODOS LOS USUARIOS (para llenar el desplegable)
app.get("/admin/usuarios", async function (req, res) {
  try {
    let usuarios = await realizarQuery(
      "SELECT id, nombre, mail FROM UsuariosBakery"
    );
    res.send({ ok: true, usuarios: usuarios || [] });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res
      .status(500)
      .send({ ok: false, message: "Error al obtener la lista de usuarios" });
  }
});

// ELIMINAR USUARIO POR ID
app.delete("/admin/eliminar-usuario", async function (req, res) {
  try {
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .send({ ok: false, message: "Falta el ID del usuario" });
    }

    // con "?" en vez de ${id}, para evitar inyección SQL
    let resultado = await realizarQuery(
      "DELETE FROM UsuariosBakery WHERE id = ?",
      [id]
    );

    if (resultado.affectedRows > 0) {
      res.send({ ok: true, message: "Usuario eliminado correctamente" });
    } else {
      res
        .status(404)
        .send({ ok: false, message: "El usuario no fue encontrado" });
    }
  } catch (error) {
    console.error("Error en /admin/eliminar-usuario:", error);
    res.status(500).send({
      ok: false,
      message: "Error en el servidor al eliminar usuario",
      error: error.message,
    });
  }
});