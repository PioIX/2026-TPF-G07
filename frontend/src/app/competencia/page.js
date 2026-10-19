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
      <button className={styles.botonInvisible}>
        Texto oculto
      </button>
    </main>
  );
}