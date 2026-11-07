"use client";

import { useEffect, useState } from "react";
import styles from "./finCopetencia.module.css";
import { leerPasteles } from "./PastelesFinales";

const FONDO = "/FinPastel.png";

// Dónde queda cada torta, en % de la escena (la imagen FinPastel.png):
//  x = centro de la torta
//  y = la BASE de la torta (el punto más bajo, donde apoya sobre el soporte)
//  w = ancho de la torta
// Si no cae justo sobre el soporte, cambiá estos números (con DEBUG = true se ve un punto rojo en x,y).
const POSICIONES = [
  { x: 29, y: 70, w: 21 }, // jugador 1 (soporte izquierdo)
  { x: 71.1, y: 70, w: 21 }, // jugador 2 (soporte derecho)
];
const DEBUG = false;

export default function FinCompetencia() {
  const [pasteles, setPasteles] = useState([null, null]);
  const [ratio, setRatio] = useState(16 / 9); // proporción de FinPastel.png (se mide sola)

  useEffect(() => {
    document.title = "Petit Bakery";
    setPasteles(leerPasteles());

    // medir la imagen de fondo para que las tortas queden pegadas a ella
    const im = new Image();
    im.onload = () => setRatio(im.naturalWidth / im.naturalHeight);
    im.src = FONDO;
  }, []);

  return (
    <main className={styles.game}>
      <div className={styles.escena} style={{ "--ratio": ratio }}>
        {POSICIONES.map((p, i) => (
          <div key={i}>
            {pasteles[i] && (
              <img
                src={pasteles[i]}
                alt={`Pastel del jugador ${i + 1}`}
                className={styles.pastel}
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: `${p.w}%`,
                  animationDelay: `${0.3 + i * 0.3}s`,
                }}
              />
            )}
            {DEBUG && <span className={styles.punto} style={{ left: `${p.x}%`, top: `${p.y}%` }} />}
          </div>
        ))}
      </div>
    </main>
  );
}