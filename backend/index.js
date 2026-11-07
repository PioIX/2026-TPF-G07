const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Server } = require("socket.io");
const { realizarQuery } = require("./modulo/mysql");

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Configuración de CORS
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);

// 2. Middleware para procesar JSON (resuelve el "Cannot read properties of undefined (reading 'correo')")
app.use(express.json());

app.get("/chats/:id_usuario", async function (req, res) {

  console.log("Hola esto anda")

  res.send("Hola esto anda")
})



    // 3. Middlewares de sesión
const sessionMiddleware = session({
  secret: "supersarasa",
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);

const server = app.listen(PORT, () => {
  console.log(`Servidor NodeJS corriendo en http://localhost:${PORT}/`);
});

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

let contador = 0;

// Salas de Petit Bakery. Cada sala va a tener un identificador, un nombre, una contraseña, el creador, los jugadores conectados y el estado de la competencia.
const salas = new Map();

function enviarSalas() {
  const lista = Array.from(salas.values())
    .filter((sala) => !sala.empezada)
    .map((sala) => ({
      id: sala.id,
      nombre: sala.nombre,
      jugadores: sala.jugadores.length,
      minimoJugadores: 2,
    }));

  io.emit("listaSalas", lista);
}

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  const req = socket.request;

  socket.on("pedirEstadoSala", ({ id }) => {
    const sala = salas.get(id);

    if (!sala || !socket.rooms.has(id)) {
      return socket.emit(
        "errorSala",
        "No estás conectado a esta sala o ya no existe."
      );
    }

    socket.emit("actualizarSala", {
      id: sala.id,
      nombre: sala.nombre,
      creador: sala.creador,
      jugadores: sala.jugadores,
      empezada: sala.empezada,
    });
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

    socket.emit("salaCreada", {
      id: sala.id,
      nombre: sala.nombre,
    });

    io.to(id).emit("actualizarSala", {
      id: sala.id,
      nombre: sala.nombre,
      jugadores: sala.jugadores,
      empezada: sala.empezada,
      creador: sala.creador,
    });

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

    sala.jugadores.push({
      id: socket.id,
      nombre: jugador,
    });

    socket.join(sala.id);

    io.to(sala.id).emit("actualizarSala", {
      id: sala.id,
      nombre: sala.nombre,
      jugadores: sala.jugadores,
      empezada: sala.empezada,
      creador: sala.creador,
    });

    socket.emit("salaUnida", {
      id: sala.id,
      nombre: sala.nombre,
    });

    enviarSalas();
  });

  // PEDIR EL LISTADO DE SALAS
  socket.on("pedirSalas", () => {
    const lista = Array.from(salas.values())
      .filter((sala) => !sala.empezada)
      .map((sala) => ({
        id: sala.id,
        nombre: sala.nombre,
        jugadores: sala.jugadores.length,
        minimoJugadores: 2,
      }));

    socket.emit("listaSalas", lista);
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

  socket.on("joinRoom", (data) => {
    if (req.session.room != undefined && req.session.room.length > 0) {
      socket.leave(req.session.room);
    }

    req.session.room = data.room;
    socket.join(req.session.room);

    console.log("Usuario entró al chat:", req.session.room);
  });

  socket.on("pingAll", (data) => {
    console.log("PING ALL:", data);
    io.emit("pingAll", { event: "Ping to all", message: data });
  });

  // PUNTO C Y D
  socket.on("sendMessage", async (data) => {
    try {
      const idChat = req.session.room || data.id_chat;
      const idUsuario = req.session.user
        ? req.session.user.id_usuario
        : data.id_usuario;
      const textoMensaje = data.message;

      if (idChat && idUsuario && textoMensaje) {
        await realizarQuery(
          "INSERT INTO Mensajes(id_chat,id_usuario,texto,hora_enviada) VALUES(?,?,?, NOW())",
          [idChat, idUsuario, textoMensaje]
        );
      }

      io.to(idChat).emit("newMessage", {
        room: idChat,
        message: textoMensaje,
        id_usuario: idUsuario,
      });
    } catch (error) {
      console.error("Error al persistir mensaje por socket:", error);
    }
  });

  socket.on("eventoPersonalizado", () => {
    contador++;
    socket.emit("respuestaPersonalizada", { contador });
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

      io.to(id).emit("actualizarSala", {
        id: sala.id,
        nombre: sala.nombre,
        jugadores: sala.jugadores,
        empezada: sala.empezada,
        creador: sala.creador,
      });
    }

    enviarSalas();
  });
});

////////////////////
// REGISTRO
////////////////////

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
        id_usuario: idDetectado, // para que el socket lo encuentre con este nombre
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

app.post("/admin/agregar-usuario", async function (req, res) {
  try {
    const { nombre, mail, contraseña, user_administrador } = req.body;

    // 1. Validar que no falten datos obligatorios
    if (!nombre || !mail || !contraseña) {
      return res
        .status(400)
        .send({ ok: false, message: "Faltan campos requeridos" });
    }

    // 2. Verificar si el correo ya existe
    let existe = await realizarQuery(
      "SELECT * FROM UsuariosBakery WHERE mail = ?",
      [mail]
    );

    if (existe && existe.length > 0) {
      return res.send({ ok: false, message: "El mail ya está registrado" });
    }

    // 3. Insertar nuevo usuario (es_admin será 1 si es verdadero, o 0 si es falso)
    let resultado = await realizarQuery(
      "INSERT INTO UsuariosBakery (nombre, mail, contraseña, user_administrador) VALUES (?, ?, ?, ?)",
      [nombre, mail, contraseña, user_administrador ? 1 : 0]
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
    res.status(500).send({ ok: false, message: "Error al obtener la lista de usuarios" });
  }
});

// ELIMINAR USUARIO POR ID
app.delete("/admin/eliminar-usuario", async function (req, res) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).send({ ok: false, message: "Falta el ID del usuario" });
    }

    let resultado = await realizarQuery(
      `DELETE FROM UsuariosBakery WHERE id = ${id}`
    );

    if (resultado.affectedRows > 0) {
      res.send({ ok: true, message: "Usuario eliminado correctamente" });
    } else {
      res.status(404).send({ ok: false, message: "El usuario no fue encontrado" });
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

// AGREGAR USUARIO (Corregido para coincidir con el campo es_admin del frontend)
app.post("/admin/agregar-usuario", async function (req, res) {
  try {
    const { nombre, mail, contraseña, es_admin } = req.body;

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
      [nombre, mail, contraseña, es_admin ? 1 : 0]
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




