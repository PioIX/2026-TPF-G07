"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./competencia.module.css";

export default function InicioPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Petit Bakery";
  }, []);

  return (
    <main className={styles.game}>
      <button type="button" className={styles["btn-imagen"]} >
        <img src="/imegen1.png" alt="Boton Empezar" />
      </button>
      <button type="button" className={styles["btn-imagen"]} onClick={() => router.push("/Horneado")}>
        <img src="/Boton4.png" alt="Boton2" />
      </button>
    <button type="button" className={styles["btn-imagen"]}>
        <img src="/imagen3.png" alt="Boton3" />
      </button>
    </main>
  );
}