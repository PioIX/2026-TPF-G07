"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./inicial.module.css";

export default function InicioPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Petit Bakery";
  }, []);

  return (
    <main className={styles.game}>
      {/* Misma caja que ocupa la imagen con "cover": el botón siempre queda debajo del cartel */}
      <div className={styles.escena}>
        <button
          type="button"
          className={styles.boton}
          onClick={() => router.push("/registro")}
        >
          <span className={styles.corazon} aria-hidden="true">♥</span>
          ¡JUGAR!
          <span className={styles.corazon} aria-hidden="true">♥</span>
        </button>
      </div>
    </main>
  );
}