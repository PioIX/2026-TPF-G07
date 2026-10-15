
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import Button from "@/components/Button";
import Buttonstyles from "@/components/Button.module.css";
import styles from "./sala-espera.module.css";

export default function SalaEsperaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idSala = searchParams.get("id");

  const { socket, isConnected } = useSocket();

  const [sala, setSala] = useState(null);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    document.title = "Petit Bakery - Sala de espera";
  }, []);

  useEffect(() => {
    if (!socket || !isConnected || !idSala) return;

    function actualizarSala(datos) {
      setSala(datos);
    }

    function recibirError(error) {
      setMensaje(error);
    }

    function iniciarCompetencia() {
      router.push(`/competencia?id=${encodeURIComponent(idSala)}`);
    }

    socket.on("actualizarSala", actualizarSala);
    socket.on("errorSala", recibirError);
    socket.on("competenciaIniciada", iniciarCompetencia);

    socket.emit("pedirEstadoSala", { id: idSala });

    return () => {
      socket.off("actualizarSala", actualizarSala);
      socket.off("errorSala", recibirError);
      socket.off("competenciaIniciada", iniciarCompetencia);
    };
  }, [socket, isConnected, idSala, router]);

  function empezarCompetencia() {
    if (!socket || !sala) return;

    setMensaje("");

    socket.emit("empezarCompetencia", {
      id: idSala,
    });
  }

  if (!idSala) {
    return (
      <main className={styles.fondo}>
        <section className={styles.panel}>
          <h1>No se indicó una sala</h1>
          <Button className={styles.Buttonstyles} onClick={() => router.push("/elegirSala")}>
            Volver a las salas
          </Button>
        </section>
      </main>
    );
  }

  const esCreador = sala?.creador === socket?.id;
  const puedeEmpezar =
    esCreador &&
    (sala?.jugadores?.length || 0) >= 2 &&
    !sala?.empezada;

  return (
    <main className={styles.fondo}>
      <section className={styles.panel}>
        <div className={styles.decoracion}>♡ 🧁 ♡</div>

        <h1>Sala de espera</h1>

        <p className={styles.etiqueta}>Nombre de la sala</p>
        <h2 className={styles.nombreSala}>
          {sala?.nombre || "Conectando con la sala..."}
        </h2>

        <div className={styles.jugadores}>
          <h3>Pasteleros en la sala</h3>

          {sala?.jugadores?.length ? (
            sala.jugadores.map((jugador) => (
              <div className={styles.jugador} key={jugador.id}>
                <span>🧁</span>
                <span>{jugador.nombre}</span>
                {jugador.id === sala.creador && (
                  <small>Anfitrión</small>
                )}
              </div>
            ))
          ) : (
            <p>Esperando información de los jugadores...</p>
          )}
        </div>

        <p className={styles.estado}>
          {sala?.jugadores?.length >= 2
            ? "¡Ya hay suficientes jugadores!"
            : "Esperando a otro jugador..."}
        </p>

        <Button
          className={styles.Buttonstyles}
          onClick={empezarCompetencia}
          disabled={!puedeEmpezar}
        >
          Empezar Competencia
        </Button>

        {!esCreador && sala && (
          <p>El anfitrión comenzará la competencia.</p>
        )}

        {mensaje && (
          <p className={styles.mensaje}>{mensaje}</p>
        )}

        <Button
          className={styles.Buttonstyles}
          onClick={() => router.push("/elegirSala")}
        >
          Volver a las salas
        </Button>
      </section>
    </main>
  );
}
