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
      (sala) =>
        sala.nombre.toLowerCase() === nombre.toLowerCase()
    );

    if (existe) {
      return socket.emit(
        "errorSala",
        "Ya existe una sala con ese nombre."
      );
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
      creador: sala.creador
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
      return socket.emit(
        "errorSala",
        "La competencia ya comenzó."
      );
    }

    if (sala.contrasena !== contrasena) {
      return socket.emit(
        "errorSala",
        "La contraseña es incorrecta."
      );
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
      creador: sala.creador      
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
      return socket.emit(
        "errorSala",
        "Solo quien creó la sala puede empezar."
      );
    }

    if (sala.jugadores.length < 2) {
      return socket.emit(
        "errorSala",
        "Necesitás al menos 2 jugadores."
      );
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
      io.to(id).emit(
        "errorSala",
        "El creador salió. La sala se cerró."
      );

      salas.delete(id);
      continue;
    }

    io.to(id).emit("actualizarSala", {
      id: sala.id,
      nombre: sala.nombre,
      jugadores: sala.jugadores,
      empezada: sala.empezada,
      creador: sala.creador
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
    const { nombre, mail, contraseña} = req.body;

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
    res.status(500).send({ message: "Error al Conectarse", error: error.message });
  }
});

// LISTADO DE CHATS:
app.get("/chats/:id_usuario", async function (req, res) {
  try {
    const { id_usuario } = req.params;

    const chats = await realizarQuery(
      `
      SELECT 
        c.id_chat,
        c.nom_grupo,

        -- 1. Buscamos la foto del contacto o la foto del grupo
        COALESCE(
          NULLIF(uec.foto_grupo, ''),
          u_otro.foto
        ) AS foto_contacto,

        -- 2. Traemos explícitamente el nombre del OTRO usuario
        u_otro.nombre AS nombre_contacto

      FROM UsuarioEnChats uec

      JOIN Chats c 
        ON uec.id_chat = c.id_chat

      -- Obtenemos directamente los datos del OTRO usuario registrado en el chat
      LEFT JOIN UsuariosWhatsapp u_otro
        ON u_otro.id_usuario = (
          SELECT uec_sub.id_usuario 
          FROM UsuarioEnChats uec_sub
          WHERE uec_sub.id_chat = c.id_chat 
            AND uec_sub.id_usuario != ?
          LIMIT 1
        )

      WHERE uec.id_usuario = ?
      `,
      [id_usuario, id_usuario]
    );

    res.send({
      ok: true,
      chats,
    });
  } catch (error) {
    res.status(500).send({
      message: "Error al listar chats",
      error: error.message,
    });
  }
});

// CREACION DE CHAT INDIVIDUAL:
app.post("/chat/individual", async function (req, res) {
  try {
    const { id_usuario_creador, correo_destinatario } = req.body;

    // 1. Buscar al destinatario por correo
    const destinatarios = await realizarQuery(
      `SELECT id_usuario FROM UsuariosWhatsapp WHERE correo = ?`,
      [correo_destinatario]
    );

    if (destinatarios.length === 0) {
      return res.status(404).send({
        message: "El usuario destinatario no existe",
      });
    }

    const id_destinatario = destinatarios[0].id_usuario;

    if (Number(id_usuario_creador) === Number(id_destinatario)) {
      return res.status(400).send({
        message: "No puedes crear un chat individual contigo mismo",
      });
    }

    const resultadoChat = await realizarQuery(
      `INSERT INTO Chats (nom_grupo) VALUES (NULL)`
    );
    const id_chat = resultadoChat.insertId;

    await realizarQuery(
      `INSERT INTO UsuarioEnChats (id_chat, id_usuario, foto_grupo) VALUES (?, ?, ?)`,
      [id_chat, id_usuario_creador, ""]
    );

    //Insertar al DESTINATARIO en UsuarioEnChats
    await realizarQuery(
      `INSERT INTO UsuarioEnChats (id_chat, id_usuario, foto_grupo) VALUES (?, ?, ?)`,
      [id_chat, id_destinatario, ""]
    );

    res.send({
      ok: true,
      message: "Chat individual creado con éxito",
      id_chat,
    });
  } catch (error) {
    res.status(500).send({
      message: "Error al crear chat individual",
      error: error.message,
    });
  }
});

// CREACION DE CHAT DE GRUPO:
app.post("/chat/grupal", async function (req, res) {
  try {
    const { nom_grupo, id_usuario_creador, correos, foto_grupo } = req.body;
    if (!nom_grupo || !id_usuario_creador) {
      return res.status(400).send({ message: "Faltan datos del grupo" });
    }

    const usuarios = [];
    for (const correo of correos || []) {
      const usuario = await realizarQuery(
        `SELECT id_usuario FROM UsuariosWhatsapp WHERE correo = ?`,
        [correo]
      );

      if (usuario.length === 0) {
        return res
          .status(404)
          .send({ message: `El usuario ${correo} no existe` });
      }

      // Evitamos agregar al creador dos veces si su correo vino en el array
      if (usuario[0].id_usuario !== Number(id_usuario_creador)) {
        usuarios.push(usuario[0].id_usuario);
      }
    }

    const resultadoChat = await realizarQuery(
      `INSERT INTO Chats (nom_grupo) VALUES (?)`,
      [nom_grupo]
    );
    const id_chat = resultadoChat.insertId;

    // Insertar al creador del grupo
    await realizarQuery(
      `INSERT INTO UsuarioEnChats (id_chat, id_usuario, foto_grupo) VALUES (?, ?, ?)`,
      [id_chat, id_usuario_creador, foto_grupo || ""]
    );

    // Insertar al resto de los integrantes (sin duplicar al creador)
    for (const idUsuario of usuarios) {
      await realizarQuery(
        `INSERT INTO UsuarioEnChats (id_chat, id_usuario, foto_grupo) VALUES (?, ?, ?)`,
        [id_chat, idUsuario, ""]
      );
    }

    res.send({
      ok: true,
      message: "Chat grupal creado con éxito",
      id_chat,
    });
  } catch (error) {
    res.status(500).send({
      message: "Error al crear chat grupal",
      error: error.message,
    });
  }
});

// HISTORIAL:
app.get("/mensajes/:id_chat", async function (req, res) {
  try {
    const { id_chat } = req.params;
    const mensajes = await realizarQuery(
      `
        SELECT m.id_mensaje, m.id_chat, m.id_usuario, u.nombre AS remitente, m.texto, m.hora_enviada
        FROM Mensajes m
        JOIN UsuariosWhatsapp u ON m.id_usuario = u.id_usuario
        WHERE m.id_chat = ?
        ORDER BY m.id_mensaje ASC
    `,
      [id_chat]
    );

    res.send({ ok: true, mensajes });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error al obtener historial", error: error.message });
  }
});
