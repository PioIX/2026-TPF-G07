"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./horneado.module.css";
import Molde from "./Molde";
import { leerPartida } from "@/lib/partida"; // lee qué torta se está haciendo en la partida actual
import { tortaDe } from "@/lib/tortas"; // videos e imágenes de cada torta

export default function CrearPastelPage() {
  const router = useRouter();
  const [fase, setFase] = useState("inicio");
  const [moldeEnHorno, setMoldeEnHorno] = useState(false);

  // Torta de la partida: videos y molde. Hasta leer la partida es null; si no hay partida, vainilla.
  const [torta, setTorta] = useState(null);
  useEffect(() => {
    setTorta(tortaDe(leerPartida()?.idTorta));
  }, []);
  const t = torta ?? tortaDe(1);
  // Fondo según la torta y la fase (si la torta no define fondo, queda el del CSS)
  const fondo = fase === "final" ? t.fondoFinal : t.fondoInicio;

  return (
    <main
      className={`${styles.game} ${ fase === "final" ? styles.fondoFinal : styles.fondoInicio}`}
      style={fondo ? { backgroundImage: `url("${fondo}")` } : undefined}
    >
      <Instrucciones
        fase={fase}
        moldeEnHorno={moldeEnHorno}
      />
      {fase === "inicio" && (
        <button
          className={styles.horno}
          onClick={() => setFase("video")}
          aria-label="Abrir horno"
        />
      )}

      {(fase === "video" || fase === "final") && (
        <video
          className={styles.video}
          src={t.horneadoVideo}
          autoPlay
          playsInline
          onEnded={() => setFase("final")}
        />
      )}

      {/* El molde se monta cuando ya se sabe la torta, para dibujar la imagen correcta */}
      {torta && (
        <Molde
          src={torta.moldeArrastrable}
          inicio={torta.moldeInicio}
          puedeArrastrar={fase === "final" && !moldeEnHorno}
          onColocado={() => setMoldeEnHorno(true)}
        />
      )}

      {/* Se activa apenas el molde queda en el horno */}
      {moldeEnHorno && (
        <video
          className={styles.videoMolde}
          src={t.moldeHornoVideo}
          autoPlay
          playsInline
          onEnded={() => router.push("/ContadorHorno")}
        />
      )}
    </main>
  );
}

function Instrucciones({ fase, moldeEnHorno }) {
  let titulo = "¡Paso 2: Hornear la mezcla!";
  let mensaje = "Hacé clic en el horno para comenzar a hornear tu pastel.";

  if (fase === "video") {
    titulo = "¡A hornear!";
    mensaje = "Esperá a que termine el proceso de horneado para continuar.";
  }

  if (fase === "final") {
    titulo = "¡Tu pastel está casi listo!";
    mensaje = "Colocá el molde dentro del horno para continuar con la preparación.";
  }

  if (moldeEnHorno) {
    titulo = "¡Excelente trabajo!";
    mensaje = "Tu pastel se está horneando.";
  }

  return (
    <aside className={styles.instrucciones}>
      <h3 className={styles.instruccionesTitulo}>
        {titulo}
      </h3>

      <p className={styles.instruccionesTexto}>
        {mensaje}
      </p>

      <span className={styles.instruccionesDecoracion}>

      </span>
    </aside>
  );
}