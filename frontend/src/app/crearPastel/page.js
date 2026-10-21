"use client";
import styles from "./crearPastel.module.css";

export default function CrearPastelPage() {
  const handleBowlClick = () => {
    console.log("Clic en el bowl");
    // aquí va lo que quieres que pase
  };

  return (
    <main className={styles.game}>
      <button
        type="button"
        className={styles.bowl}
        onClick={handleBowlClick}
        aria-label="Bowl"
      >
        <img src="/objetos/bowl.png" alt="" />
      </button>
    </main>
  );
}