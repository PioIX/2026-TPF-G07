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

io.on("connection", (socket) => {
  const req = socket.request;
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
    console.log("Disconnect");
  });
});
app.post("/register", async function (req, res) {
  try {
    const { nombre, correo, contraseña, foto } = req.body;

    let respuesta = await realizarQuery(
      "SELECT * FROM UsuariosWhatsapp WHERE correo = ?",
      [correo]
    );

    if (respuesta && respuesta.length > 0) {
      return res.send({ ok: false, message: "El usuario ya existe" });
    }

    let resultado = await realizarQuery(
      "INSERT INTO UsuariosWhatsapp(nombre, correo, contraseña, foto) VALUES (?, ?, ?, ?)",
      [nombre, correo, contraseña, foto || null]
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
// LOGIN:
app.post("/login", async function (req, res) {
  try {
    console.log("Datos recibidos en sesión:", req.body);
    let respuesta = await realizarQuery(
      `SELECT * FROM UsuariosBakery WHERE mail = "${req.body.mail}" AND contraseña = "${req.body.contraseña}";`
    );

    if (respuesta.length > 0) {
      const idDetectado = respuesta[0].id;

      req.session.user = {
        id: idDetectado,
        nombre: respuesta[0].nombre,
        mail: respuesta[0].mail,
      };

      res.send({
        message: "Inicio de sesion hecho",
        id: idDetectado,
      });
    } else {
      res.send({
        message: "Usuario inexistente",
      });
    }
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error al Conectarse", error: error.message });
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
