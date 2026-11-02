"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./competencia3.module.css";

export default function InicioPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Petit Bakery";
  }, []);

  return (
    <main className={styles.game}>
      <button type="button" className={styles["btn-imagen"]}>
        <img src="/imegen1.png" alt="Boton Empezar" />
      </button>
      <button type="button" className={styles["btn-imagen"]} onClick={() => router.push("/Horneado")}>
        <img src="/Boton4.png" alt="Boton2" />
      </button>
      <button type="button" className={styles["btn-imagen"]} onClick={() => router.push("/decorarPastel")}>
        <img src="/boton5.png" alt="3. Decorar el pastel" />
      </button>
    </main>
  );
}