
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
