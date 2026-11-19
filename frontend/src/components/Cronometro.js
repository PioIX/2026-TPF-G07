"use client";

// Va en: src/components/Cronometro.js  (archivo NUEVO)
// Se pone UNA vez en src/app/layout.js y se muestra solo durante la partida.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { leerPartida } from "@/lib/partida";
import styles from "./Cronometro.module.css";

// Pantallas donde NO se muestra
const OCULTO_EN = ["/", "/login", "/registro", "/elegirSala", "/sala-espera", "/admin"];

function formatear(ms) {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function Cronometro() {
  const pathname = usePathname();
  const [info, setInfo] = useState(null); // { ms, detenido }

  useEffect(() => {
    const calcular = () => {
      const p = leerPartida();
      if (!p?.inicio) return setInfo(null);
      const hasta = p.fin ?? Date.now();
      setInfo({ ms: Math.max(0, hasta - p.inicio), detenido: !!p.fin });
    };
    calcular();
    const id = setInterval(calcular, 250);
    return () => clearInterval(id);
  }, [pathname]);

  if (!info || OCULTO_EN.includes(pathname)) return null;

  return (
    <div
      className={`${styles.cronometro} ${info.detenido ? styles.detenido : ""}`}
      role="timer"
      aria-label="Tiempo de la competencia"
    >
      <span aria-hidden="true">⏱</span>
      <span className={styles.tiempo}>{formatear(info.ms)}</span>
    </div>
  );
}