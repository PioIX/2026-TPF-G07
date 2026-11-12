"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./horneado.module.css";
import Molde from "./Molde";

export default function CrearPastelPage() {
  const router = useRouter();
  const [fase, setFase] = useState("inicio");
  const [moldeEnHorno, setMoldeEnHorno] = useState(false);

  return (
    <main className={`${styles.game} ${ fase === "final" ? styles.fondoFinal : styles.fondoInicio}`}>
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
          src="/horneado.mp4"
          autoPlay
          playsInline
          onEnded={() => setFase("final")}
        />
      )}

      <Molde
        puedeArrastrar={fase === "final" && !moldeEnHorno}
        onColocado={() => setMoldeEnHorno(true)}
      />

      {/* NUEVO: se activa apenas el molde queda en el horno */}
      {moldeEnHorno && (
        <video
          className={styles.videoMolde}
          src="/molde-horno.mp4"
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