"use client";
import { useState } from "react";
import styles from "./ContadorHorno.module.css";
import Button from "@/components/Button";
import Buttonstyle from "@/components/Button.module.css";

const META = 10;

export default function ContadorHornoPage() {
  const [toques, setToques] = useState(0);
  const [brillos, setBrillos] = useState([]);
  const horneado = toques >= META;

  const tocar = () => {
    if (horneado) return;
    const nuevo = toques + 1;
    setToques(nuevo);

    if (nuevo >= META) {
      // los brillitos se generan una sola vez, al terminar
      setBrillos(
        Array.from({ length: 36 }, (_, i) => ({
          id: i,
          left: 50 + (Math.random() - 0.5) * 60, // % horizontal alrededor del centro
          top: 40 + (Math.random() - 0.5) * 50,  // % vertical
          size: 14 + Math.random() * 26,         // px
          delay: Math.random() * 1.2,            // s
          duracion: 1 + Math.random() * 1.2,     // s
        }))
      );
    }
  };

  return (
    <main className={styles.game}>
      {horneado && (
        <>
          <div className={styles.resultado}>
            <img
              src="/pastel-horneado.png"
              alt="Pastel horneado"
              className={styles.pastel}
            />
            <p className={styles.mensaje}>¡Pastel horneado!</p>
          </div>

          {brillos.map((b) => (
            <span
              key={b.id}
              className={styles.brillo}
              style={{
                left: `${b.left}%`,
                top: `${b.top}%`,
                fontSize: `${b.size}px`,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.duracion}s`,
              }}
            >
              ✦
            </span>
          ))}
        </>
      )}

      {!horneado && (
        <div className={styles.panel}>
          <Button className={Buttonstyle.boton} onClick={tocar}>
            Hornear
          </Button>
          <div className={styles.barra}>
            <div
              className={styles.relleno}
              style={{ width: `${(toques / META) * 100}%` }}
            />
          </div>
          <p className={styles.contador}>
            {toques} / {META}
          </p>
        </div>
      )}
    </main>
  );
}