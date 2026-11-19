"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import Button from "@/components/Button";
import Buttonstyles from "@/components/Button.module.css";
import styles from "./lobby.module.css";

export default function LobbyPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [panel, setPanel] = useState(null);
  const [nombreSala, setNombreSala] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombreJugador, setNombreJugador] = useState("");
  const [salas, setSalas] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const [salaSeleccionada, setSalaSeleccionada] = useState("");
  const [idTorta, setIdTorta] = useState(1); // 1 = vainilla, 2 = chocolate

  useEffect(() => {
    document.title = "Petit Bakery - Salas";
  }, []);

  useEffect(() => {
    if (!socket) return;

    const recibirSalas = (lista) => setSalas(lista);

    const salaCreada = (sala) => {
      router.push(
        `/sala-espera?id=${encodeURIComponent(sala.id)}`
      );
    };

    const salaUnida = (sala) => {
      router.push(
        `/sala-espera?id=${encodeURIComponent(sala.id)}`
      );
    };

    const errorSala = (error) => setMensaje(error);

    socket.on("listaSalas", recibirSalas);
    socket.on("salaCreada", salaCreada);
    socket.on("salaUnida", salaUnida);
    socket.on("errorSala", errorSala);

    if (socket.connected) {
      socket.emit("pedirSalas");
    }

    return () => {
      socket.off("listaSalas", recibirSalas);
      socket.off("salaCreada", salaCreada);
      socket.off("salaUnida", salaUnida);
      socket.off("errorSala", errorSala);
    };
  }, [socket, router]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit("pedirSalas");
    }
  }, [socket, isConnected]);

  // id del usuario que guardó el login (null si entró sin iniciar sesión)
  function idUsuarioLogueado() {
    try {
      return Number(localStorage.getItem("id")) || null;
    } catch {
      return null;
    }
  }

  function abrirPanel(tipo, sala = "") {
    setPanel(tipo);
    setSalaSeleccionada(sala);
    setNombreSala(sala);
    setContrasena("");
    setMensaje("");
  }

  function crearSala(e) {
    e.preventDefault();

    if (!socket || !isConnected) {
      setMensaje("Esperá a que se conecte el servidor.");
      return;
    }

    if (!nombreSala.trim() || !contrasena.trim()) {
      setMensaje("Completá el nombre y la contraseña.");
      return;
    }

    socket.emit("crearSala", {
      nombre: nombreSala.trim(),
      contrasena,
      jugador: nombreJugador.trim() || "Pastelero",
      idUsuario: idUsuarioLogueado(),
      idTorta,
    });
  }

  function unirseSala(e) {
    e.preventDefault();

    if (!socket || !isConnected) {
      setMensaje("Esperá a que se conecte el servidor.");
      return;
    }

    if (!nombreSala.trim() || !contrasena.trim()) {
      setMensaje("Completá el nombre y la contraseña.");
      return;
    }

    socket.emit("unirseSala", {
      id: salaSeleccionada || nombreSala.trim().toLowerCase(),
      contrasena,
      jugador: nombreJugador.trim() || "Pastelero",
      idUsuario: idUsuarioLogueado(),
    });
  }

  return (
    <main className={styles.game}>
      <div className={styles.escena}>
        <div className={styles.botones}>
          <div className={styles.item}>
            <Button
              className = {styles.Buttonstyles}
              type="button"
              onClick={() => abrirPanel("crear")}
            >
              <span className={Buttonstyles.corazon}>♥</span>
              Crear sala
              <span className={Buttonstyles.corazon}>♥</span>
            </Button>
          </div>

          <div className={styles.item}>
            <Button
              type="button"
              onClick={() => abrirPanel("unirse")}
            >
              <span className={Buttonstyles.corazon}>♥</span>
              Unirse a sala
              <span className={Buttonstyles.corazon}>♥</span>
            </Button>
          </div>
        </div>

        <section className={styles.listaSalas}>
          <h2>Salas disponibles</h2>

          {!isConnected && (
            <p>Conectando con Petit Bakery...</p>
          )}

          {isConnected && salas.length === 0 && (
            <p>Todavía no hay salas disponibles.</p>
          )}

          {salas.map((sala) => (
            <div className={styles.itemSala} key={sala.id}>
              <div>
                <strong>{sala.nombre}</strong>
                <p>
                  Jugadores: {sala.jugadores}/2 mínimo
                </p>
              </div>

              <Button
                type="button"
                className={styles.Buttonstyles}
                onClick={() =>
                  abrirPanel("unirse", sala.id)
                }
              >
                Unirse
              </Button>
            </div>
          ))}
        </section>

        {panel && (
          <div className={styles.fondoModal}>
            <section className={styles.panelSala}>
              <button
                type="button"
                className={styles.cerrar}
                onClick={() => setPanel(null)}
                aria-label="Cerrar"
              >
                ×
              </button>

              <h2>
                {panel === "crear"
                  ? "Crear sala"
                  : "Unirse a sala"}
              </h2>

              <form
                onSubmit={
                  panel === "crear"
                    ? crearSala
                    : unirseSala
                }
              >
                <label htmlFor="nombreJugador">
                  Tu nombre:
                </label>
                <input
                  id="nombreJugador"
                  value={nombreJugador}
                  onChange={(e) =>
                    setNombreJugador(e.target.value)
                  }
                  placeholder="Tu nombre"
                  maxLength={30}
                  required
                />

                <label htmlFor="nombreSala">
                  Nombre de sala:
                </label>
                <input
                  id="nombreSala"
                  value={nombreSala}
                  onChange={(e) =>
                    setNombreSala(e.target.value)
                  }
                  placeholder="Nombre de la sala"
                  maxLength={40}
                  readOnly={panel === "unirse" && !!salaSeleccionada}
                  required
                />

                <label htmlFor="contrasenaSala">
                  Contraseña:
                </label>
                <input
                  id="contrasenaSala"
                  type="password"
                  value={contrasena}
                  onChange={(e) =>
                    setContrasena(e.target.value)
                  }
                  placeholder="Contraseña de la sala"
                  required
                />

                {panel === "crear" && (
                  <>
                    <label>Torta a preparar:</label>
                    <div style={{ display: "flex", gap: "10px", margin: "6px 0 12px" }}>
                      {[
                        { id: 1, texto: "🍰 Vainilla" },
                        { id: 2, texto: "🍫 Chocolate" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setIdTorta(t.id)}
                          aria-pressed={idTorta === t.id}
                          style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "12px",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: "1rem",
                            border: idTorta === t.id ? "3px solid #b0476b" : "2px solid #e5b9c9",
                            background: idTorta === t.id ? "#ffe9f1" : "#fff",
                          }}
                        >
                          {t.texto}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className={styles.botonSala}
                >
                  {panel === "crear" ? "Crear sala" : "Unirse"}
                </button>
              </form>

              {mensaje && (
                <p className={styles.mensaje}>{mensaje}</p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}