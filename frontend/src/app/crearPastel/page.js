"use client";
import { useState } from "react";
import styles from "./crearPastel.module.css";

// x, y = centro del objeto (% del ancho/alto de la escena), w = ancho (% del ancho)
const OBJETOS = [
  // izquierda
  { id: "harina",       src: "/objetos/harina.png",       x: 18,   y: 38, w: 13 },
  { id: "manteca",      src: "/objetos/manteca.png",      x: 13,   y: 62, w: 10 },
  { id: "azucar",       src: "/objetos/azucar.png",       x: 24,   y: 60, w: 10 },
  { id: "huevos",       src: "/objetos/huevos.png",       x: 10.5, y: 82, w: 11 },
  { id: "repasador",    src: "/objetos/repasador.png",    x: 22,   y: 80, w: 9 },
  // derecha
  { id: "bowl",         src: "/objetos/bowl.png",         x: 78,   y: 38, w: 17 },
  { id: "azucarMorena", src: "/objetos/azucarMorena.png", x: 90,   y: 36, w: 6.5 },
  { id: "bicarbonato",  src: "/objetos/bicarbonato.png",  x: 91,   y: 56, w: 7.5 },
  { id: "vainilla",     src: "/objetos/vainilla.png",     x: 75,   y: 60, w: 5.5 },
  { id: "chocolate",    src: "/objetos/chocolate.png",    x: 82,   y: 62, w: 8.5 },
  { id: "maicena",      src: "/objetos/maicena.png",      x: 84,   y: 80, w: 9.5 },
  { id: "polvoHornear", src: "/objetos/polvoHornear.png", x: 92,   y: 80, w: 6.5 },
];

export default function CrearPastelPage() {
  const [mezclando, setMezclando] = useState(false);

  const handleBowlClick = () => {
    setMezclando(true);
  };

  return (
    <main className={`${styles.game} ${mezclando ? styles.gameMezcla : ""}`}>
      {/* Escena 1: bowl como botón */}
      {!mezclando && (
        <button
          type="button"
          className={styles.bowl}
          onClick={handleBowlClick}
          aria-label="Bowl"
        >
          <img src="/objetos/bowl.png" alt="" />
        </button>
      )}

      {/* Escena 2: mesada con todos los ingredientes */}
      {mezclando && (
        <div className={styles.escena}>
          {OBJETOS.map((o) => (
            <img
              key={o.id}
              src={o.src}
              alt={o.id}
              className={styles.objeto}
              style={{ left: `${o.x}%`, top: `${o.y}%`, width: `${o.w}%` }}
              draggable={false}
            />
          ))}
        </div>
      )}
    </main>
  );
}