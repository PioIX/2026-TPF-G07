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
    <main
      className={`${styles.game} ${
        fase === "final" ? styles.fondoFinal : styles.fondoInicio
      }`}
    >
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