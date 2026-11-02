"use client";
import { useEffect, useRef } from "react";
import styles from "./horneado.module.css";

// Todo está en fracciones de la pantalla (0 a 1), así funciona en cualquier tamaño
const INICIO = { x: 0.3, y: 0.82 };          // dónde arranca el molde (sobre la mesada)
const ANCHO = 0.24;                           // ancho del molde = 17% del ancho de pantalla
const ZONA_HORNO = { x: 0.7, y: 0.55, w: 0.28, h: 0.4 }; // zona donde "cuenta" soltarlo
const POS_HORNO = { x: 0.85, y: 0.76 };       // dónde queda al soltarlo en el horno
const ESCALA_HORNO = 0.69;                     // se achica un poco al entrar
const DEBUG = false;                          // true para ver la zona del horno en rojo

export default function Molde({ puedeArrastrar, onColocado }) {
  const canvasRef = useRef(null);
  const props = useRef({ puedeArrastrar, onColocado });

  useEffect(() => {
    props.current = { puedeArrastrar, onColocado };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = "/molde.png";

    const s = { x: INICIO.x, y: INICIO.y, escala: 1, arrastrando: false, offX: 0, offY: 0, colocado: false };

    const medidas = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const mw = w * ANCHO * s.escala;
      const mh = mw * (img.naturalHeight / img.naturalWidth);
      return { w, h, mw, mh, left: s.x * w - mw / 2, top: s.y * h - mh / 2 };
    };

    const dibujar = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      if (DEBUG) {
        ctx.fillStyle = "rgba(255,0,0,0.3)";
        ctx.fillRect(ZONA_HORNO.x * w, ZONA_HORNO.y * h, ZONA_HORNO.w * w, ZONA_HORNO.h * h);
      }

      if (!img.complete || !img.naturalWidth) return;
      const m = medidas();
      if (s.arrastrando) {
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
      }
      ctx.drawImage(img, m.left, m.top, m.mw, m.mh);
      ctx.shadowColor = "transparent";
    };

    const ajustarTamano = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dibujar();
    };

    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { px: e.clientX - r.left, py: e.clientY - r.top };
    };

    const tocaMolde = (px, py) => {
      const m = medidas();
      return px >= m.left && px <= m.left + m.mw && py >= m.top && py <= m.top + m.mh;
    };

    const onDown = (e) => {
      if (!props.current.puedeArrastrar || s.colocado) return;
      const { px, py } = pos(e);
      if (!tocaMolde(px, py)) return;
      const m = medidas();
      s.arrastrando = true;
      s.offX = px - s.x * m.w;
      s.offY = py - s.y * m.h;
      dibujar();
    };

    const onMove = (e) => {
      const { px, py } = pos(e);
      const main = canvas.parentElement;
      if (s.arrastrando) {
        const m = medidas();
        s.x = (px - s.offX) / m.w;
        s.y = (py - s.offY) / m.h;
        main.style.cursor = "grabbing";
        dibujar();
      } else {
        const sobre = props.current.puedeArrastrar && !s.colocado && tocaMolde(px, py);
        main.style.cursor = sobre ? "grab" : "";
      }
    };

    const onUp = () => {
      if (!s.arrastrando) return;
      s.arrastrando = false;
      canvas.parentElement.style.cursor = "";

      const dentro =
        s.x >= ZONA_HORNO.x && s.x <= ZONA_HORNO.x + ZONA_HORNO.w &&
        s.y >= ZONA_HORNO.y && s.y <= ZONA_HORNO.y + ZONA_HORNO.h;

      if (dentro) {
        s.x = POS_HORNO.x;
        s.y = POS_HORNO.y;
        s.escala = ESCALA_HORNO;
        s.colocado = true;
        props.current.onColocado?.();
      } else {
        s.x = INICIO.x; // si lo soltás afuera, vuelve a la mesada
        s.y = INICIO.y;
      }
      dibujar();
    };

    img.onload = dibujar;
    ajustarTamano();
    window.addEventListener("resize", ajustarTamano);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("resize", ajustarTamano);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}