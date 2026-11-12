"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./decorarPastel.module.css";
import Button from "@/components/Button"; // ajustá la ruta a donde esté tu componente
import { guardarPastel } from "../finCompetencia/PastelesFinales";
import { guardarResultado } from "@/lib/partida"; // NUEVO: guarda el tiempo total en la base al terminar

// Resolución lógica del canvas = tamaño de mesada.png
const W = 1219;
const H = 645;
const SC = 2; // resolución interna (2 = el doble de nítido)
const px = (p) => (p / 100) * W; // % del ancho -> px lógicos
const py = (p) => (p / 100) * H; // % del alto  -> px lógicos

// A dónde lleva el botón cuando terminás de decorar (cambialo por tu ruta)
const RUTA_FIN = "/finCompetencia";
const FIN_DELAY = 1200; // ms entre el último paso y la aparición del botón

// x, y = centro (% de la escena), w = ancho (% del ancho)
const OBJETOS = [
  // izquierda: las dos cremas una arriba de la otra, y la espátula al costado
  { id: "cremaRosa",     src: "/objetosDecoracion/cobertura.png",     x: 22, y: 54, w: 12 },
  { id: "cremaLila",     src: "/objetosDecoracion/cobertura1.png",     x: 22, y: 78, w: 12 },
  { id: "espatula",      src: "/objetosDecoracion/espatula.png",      x: 8,  y: 66, w: 13, home: { x: 12, y: 47 } },
  // derecha: grageas arriba y las dos mangas (mismo tamaño) abajo
  { id: "grageas",       src: "/objetosDecoracion/granas.png",       x: 83, y: 42, w: 12 },
  { id: "mangaAmarilla", src: "/objetosDecoracion/mangaAmarilla.png", x: 78, y: 66, w: 8 },
  { id: "mangaAzul",     src: "/objetosDecoracion/mangaAzul.png",     x: 88, y: 66, w: 8 },
];

// El pastel (sin movimiento en esta pantalla)
const PASTEL = { src: "/objetosDecoracion/pastelHorneado.png", x: 50, y: 54, w: 34 };

// Cuánto más grande se ve la herramienta al agarrarla, respecto del objeto de la mesada
const TOOL_ESCALA = 1.1;

// Bowl de grageas: al arrastrarlo se inclina como si lo estuvieras volcando.
// TILT_GRAGEAS: ángulo en radianes (negativo = se inclina hacia la izquierda, -0.95 ≈ 55°).
// BORDE_GRAGEAS: de dónde caen las grageas, medido desde el centro de la imagen
// del bowl en fracción de su ancho (dx negativo = borde izquierdo, dy negativo = hacia arriba).
// Si las grageas no salen justo del borde, ajustá estos dos números (con DEBUG_PUNTA = true se ve el punto).
const TILT_GRAGEAS = -0.95;
const TILT_MS = 300; // cuánto tarda en inclinarse
const BORDE_GRAGEAS = { dx: -0.4, dy: -0.14 };

// Colores
const CREMAS = {
  cremaRosa: { base: "#ff7fa8", claro: "#ffc9da" },
  cremaLila: { base: "#bd85ee", claro: "#e8d2fb" },
};
const MANGAS = {
  mangaAmarilla: { base: "#ffd84d", borde: "#d99a00" },
  mangaAzul:     { base: "#5ec8f2", borde: "#2a8fc4" },
};
const GRAGEAS_COLORES = ["#ff5fa2", "#ffd93b", "#4cc9f0", "#8ae234", "#b57bff", "#ff9f43"];

/*
 * PASOS: el orden de este array ES el orden del juego y de la lista.
 *  - nombre  : lo que se lee en la lista
 *  - objetos : ids de OBJETOS en los que hay que hacer clic
 *  - punta   : de dónde sale la crema en la herramienta ("derecha" = punta de la espátula,
 *              "abajo" = pico de la manga / base del bowl). Se detecta sola desde la imagen.
 */
const PASOS = [
  { id: "crema",   nombre: "Elegí una crema",      objetos: ["cremaRosa", "cremaLila"] },
  { id: "cubrir",  nombre: "Cubrí el pastel",      objetos: ["espatula"], punta: "derecha" },
  { id: "manga",   nombre: "Decorá con la manga",  objetos: ["mangaAmarilla", "mangaAzul"], punta: "abajo" },
  { id: "grageas", nombre: "Agregá grageas",       objetos: ["grageas"], punta: "borde" },
];

const PASO_MANGA = PASOS.findIndex((p) => p.id === "manga");
const PASO_GRAGEAS = PASOS.findIndex((p) => p.id === "grageas");

const RADIO_CREMA = 24;       // grosor de la espátula (px lógicos)
const META_COBERTURA = 1;     // % del pastel que hay que cubrir (al llegar, se rellena el resto)
const META_PUNTOS = 90;       // estrellitas de manga
const META_GRAGEAS = 900;     // grageas (antes 260: ahora el paso dura bastante más)
const ESP_CREMA = 5;          // distancia entre "sellos" de crema
const ESP_MANGA = 14;         // distancia entre estrellitas
const ESP_GRAGEAS = 7;        // distancia entre tandas de grageas
const PASO_RELLENO = 8;       // separación de los sellos del relleno final de crema

// Cuadrícula para medir cuánto del pastel está cubierto
const GX = 40;
const GY = 26;

const CONTORNO_EXPORT = 3; // px extra alrededor del pastel al exportarlo (para no cortar el contorno oscuro)
const DEBUG_MASK = false;  // true: tiñe de rojo la zona del pastel donde se puede decorar
const DEBUG_PUNTA = false; // true: punto rojo en la punta de la herramienta

// Imágenes que usa el canvas
const SRC = {
  fondo: "/mesada.png",
  pastel: PASTEL.src,
  ...Object.fromEntries(OBJETOS.map((o) => [o.id, o.src])),
};

const clamp = (v) => Math.min(Math.max(v, 0), 1);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);

const cargar = (src) =>
  new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => {
      console.warn("No se pudo cargar:", src);
      res(null);
    };
    i.src = src;
  });

// Punta de una herramienta, medida desde el centro de su imagen en fracción del ANCHO.
// "abajo": punto más bajo (pico de la manga). "derecha": punto más a la derecha (espátula).
function puntaDe(img, modo) {
  if (!img) return { dx: 0, dy: 0 };
  const cw = 300;
  const ch = Math.max(1, Math.round((cw * img.naturalHeight) / img.naturalWidth));
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, cw, ch);
  let data;
  try {
    data = g.getImageData(0, 0, cw, ch).data;
  } catch {
    return { dx: 0, dy: 0 };
  }
  const op = (x, y) => data[(y * cw + x) * 4 + 3] > 40;
  let tx = cw / 2, ty = ch / 2;
  if (modo === "abajo") {
    let maxY = -1;
    for (let y = ch - 1; y >= 0 && maxY < 0; y--) for (let x = 0; x < cw; x++) if (op(x, y)) { maxY = y; break; }
    if (maxY >= 0) {
      let sx = 0, n = 0;
      for (let y = Math.max(0, maxY - 2); y <= maxY; y++) for (let x = 0; x < cw; x++) if (op(x, y)) { sx += x; n++; }
      tx = sx / n; ty = maxY;
    }
  } else {
    let maxX = -1;
    for (let x = cw - 1; x >= 0 && maxX < 0; x--) for (let y = 0; y < ch; y++) if (op(x, y)) { maxX = x; break; }
    if (maxX >= 0) {
      let sy = 0, n = 0;
      for (let x = Math.max(0, maxX - 2); x <= maxX; x++) for (let y = 0; y < ch; y++) if (op(x, y)) { sy += y; n++; }
      tx = maxX; ty = sy / n;
    }
  }
  return { dx: tx / cw - 0.5, dy: (ty / ch - 0.5) * (ch / cw) };
}

function EscenaDecorar({ onPaso, onProgreso, onFin, terminarRef }) {
  const canvasRef = useRef(null);
  const onPasoRef = useRef(onPaso);
  const onProgresoRef = useRef(onProgreso);
  const onFinRef = useRef(onFin);
  onPasoRef.current = onPaso;
  onProgresoRef.current = onProgreso;
  onFinRef.current = onFin;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(SC, 0, 0, SC, 0, 0);
    const imgs = {};
    let raf;
    let vivo = true;

    // Estado del juego (objeto normal: el loop del canvas no usa useState)
    const s = {
      paso: 0,
      elegido: {}, // { crema: id, manga: id }
      cremaCol: null,
      mangaCol: null,
      hover: null,
      hoverT: {},
      shake: null, // { id, t0 } al hacer clic en un objeto equivocado
      mano: null, // herramienta en uso
      ptr: { x: 0, y: 0 }, // último punto del puntero
      puntas: {},
      progreso: 0, // 0..1 del paso actual
      puntos: 0,
      grageas: 0,
      fin: null,
      finAvisado: false,
      particulas: [],
      repPaso: 0,
      repProg: -1,
      // pastel y capa de decoración
      cake: null,
      mask: null,
      maskAlpha: null,
      mw: 0,
      deco: null,
      dctx: null,
      comp: null,
      compCtx: null,
      hayDeco: false,
      valid: null,
      cov: null,
      nValid: 0,
      nCov: 0,
    };

    // ---------- geometría ----------
    const rectDe = (im, cx, cy, wPx) =>
      im ? { x: cx, y: cy, w: wPx, h: (wPx * im.naturalHeight) / im.naturalWidth } : null;
    const dentro = (r, mx, my) =>
      r && Math.abs(mx - r.x) < r.w / 2 && Math.abs(my - r.y) < r.h / 2;
    const rectObjeto = (o) => rectDe(imgs[o.id], px(o.x), py(o.y), px(o.w));
    const toolW = (o) => px(o.w * TOOL_ESCALA);
    const rectMano = () => {
      const c = s.mano;
      return c ? rectDe(imgs[c.obj.id], c.x, c.y, toolW(c.obj)) : null;
    };
    // Dónde aparece (y a dónde vuelve) la herramienta: junto al objeto, hacia el centro
    // (si el objeto tiene "home", aparece ahí; si no, junto a él hacia el centro)
    const homeDe = (o) =>
      o.home
        ? { x: px(o.home.x), y: py(o.home.y) }
        : { x: px(o.x + (o.x < 50 ? 10 : -10)), y: py(o.y - 8) };
    const tipOff = (c) => {
      const k = c.step.punta ?? "abajo";
      const key = c.obj.id + k;
      if (!s.puntas[key]) s.puntas[key] = k === "borde" ? BORDE_GRAGEAS : puntaDe(imgs[c.obj.id], k);
      return s.puntas[key];
    };

    // ---------- preparar el pastel: máscara de la parte decorable + capa de decoración ----------
    function prepararPastel() {
      const im = imgs.pastel;
      if (!im) return;
      const w = px(PASTEL.w);
      const h = (w * im.naturalHeight) / im.naturalWidth;
      const cake = { x: px(PASTEL.x), y: py(PASTEL.y), w, h, left: px(PASTEL.x) - w / 2, top: py(PASTEL.y) - h / 2 };
      const mw = Math.round(w * SC);
      const mh = Math.round(h * SC);

      // máscara: solo el pastel (color anaranjado), sin el plato
      const mk = document.createElement("canvas");
      mk.width = mw;
      mk.height = mh;
      const g = mk.getContext("2d", { willReadFrequently: true });
      g.drawImage(im, 0, 0, mw, mh);
      let data = null;
      try {
        data = g.getImageData(0, 0, mw, mh);
      } catch {
        data = null;
      }
      if (data) {
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          let ok = false;
          if (d[i + 3] > 40) {
            const mx = Math.max(d[i], d[i + 1], d[i + 2]);
            const mn = Math.min(d[i], d[i + 1], d[i + 2]);
            ok = mx > 0 && (mx - mn) / mx > 0.3; // saturado = pastel; grisáceo = plato
          }
          d[i] = d[i + 1] = d[i + 2] = 255;
          d[i + 3] = ok ? 255 : 0;
        }
        g.putImageData(data, 0, 0);
        s.maskAlpha = d;
      }
      s.mask = mk;
      s.mw = mw;

      // capa donde se pinta la decoración (en px lógicos del pastel)
      const deco = document.createElement("canvas");
      deco.width = mw;
      deco.height = mh;
      s.deco = deco;
      s.dctx = deco.getContext("2d");
      s.dctx.scale(SC, SC);
      const comp = document.createElement("canvas");
      comp.width = mw;
      comp.height = mh;
      s.comp = comp;
      s.compCtx = comp.getContext("2d");
      s.cake = cake;

      // cuadrícula de cobertura (solo celdas que caen sobre el pastel)
      s.valid = new Uint8Array(GX * GY);
      s.cov = new Uint8Array(GX * GY);
      for (let j = 0; j < GY; j++) {
        for (let i = 0; i < GX; i++) {
          if (enCake(((i + 0.5) / GX) * w, ((j + 0.5) / GY) * h)) {
            s.valid[j * GX + i] = 1;
            s.nValid++;
          }
        }
      }
    }

    // ¿este punto (en coordenadas del pastel) cae sobre el pastel?
    function enCake(lx, ly) {
      const c = s.cake ?? { w: px(PASTEL.w), h: 1e9 };
      if (lx < 0 || ly < 0 || lx >= c.w || ly >= c.h) return false;
      if (!s.maskAlpha) return true;
      const idx = ((((ly * SC) | 0) * s.mw) + ((lx * SC) | 0)) * 4 + 3;
      return s.maskAlpha[idx] > 128;
    }

    // ---------- pintar sobre el pastel ----------
    function estamparCrema(lx, ly) {
      const d = s.dctx;
      const col = s.cremaCol;
      const r = RADIO_CREMA;
      const g = d.createRadialGradient(lx - r * 0.35, ly - r * 0.35, 2, lx, ly, r);
      g.addColorStop(0, col.claro);
      g.addColorStop(1, col.base);
      d.fillStyle = g;
      d.beginPath();
      d.arc(lx, ly, r, 0, Math.PI * 2);
      d.fill();
      s.hayDeco = true;
      // marcar celdas cubiertas
      const c = s.cake;
      const R = r * 0.9;
      for (let j = 0; j < GY; j++) {
        const cy = ((j + 0.5) / GY) * c.h;
        if (Math.abs(cy - ly) > R) continue;
        for (let i = 0; i < GX; i++) {
          const k = j * GX + i;
          if (!s.valid[k] || s.cov[k]) continue;
          const cx = ((i + 0.5) / GX) * c.w;
          if (Math.hypot(cx - lx, cy - ly) < R) {
            s.cov[k] = 1;
            s.nCov++;
          }
        }
      }
    }

    // Al llegar a la meta, cubre lo que haya quedado sin crema (bordes, costado del pastel)
    function rellenarCrema() {
      const c = s.cake;
      if (!c || !s.cremaCol) return;
      for (let y = 0; y < c.h; y += PASO_RELLENO) {
        for (let x = 0; x < c.w; x += PASO_RELLENO) {
          if (enCake(x, y)) estamparCrema(x, y);
        }
      }
      s.nCov = s.nValid;
    }

    function estamparEstrella(lx, ly) {
      const d = s.dctx;
      const col = s.mangaCol;
      const puntas = 8, R = 11, r = 7.5;
      d.beginPath();
      for (let i = 0; i < puntas * 2; i++) {
        const a = (i * Math.PI) / puntas - Math.PI / 2;
        const rad = i % 2 === 0 ? R : r;
        const x = lx + Math.cos(a) * rad;
        const y = ly + Math.sin(a) * rad;
        if (i === 0) d.moveTo(x, y);
        else d.lineTo(x, y);
      }
      d.closePath();
      d.fillStyle = col.base;
      d.strokeStyle = col.borde;
      d.lineWidth = 1.5;
      d.fill();
      d.stroke();
      d.fillStyle = "rgba(255,255,255,0.55)";
      d.beginPath();
      d.arc(lx - 3, ly - 3, 2.4, 0, Math.PI * 2);
      d.fill();
      s.hayDeco = true;
    }

    function estamparGragea(lx, ly) {
      const d = s.dctx;
      const w = 11, h = 4.4;
      d.save();
      d.translate(lx, ly);
      d.rotate(Math.random() * Math.PI);
      d.fillStyle = GRAGEAS_COLORES[(Math.random() * GRAGEAS_COLORES.length) | 0];
      d.strokeStyle = "rgba(0,0,0,0.25)";
      d.lineWidth = 0.8;
      d.beginPath();
      d.moveTo(-w / 2 + h / 2, -h / 2);
      d.lineTo(w / 2 - h / 2, -h / 2);
      d.arc(w / 2 - h / 2, 0, h / 2, -Math.PI / 2, Math.PI / 2);
      d.lineTo(-w / 2 + h / 2, h / 2);
      d.arc(-w / 2 + h / 2, 0, h / 2, Math.PI / 2, Math.PI * 1.5);
      d.closePath();
      d.fill();
      d.stroke();
      d.restore();
      s.hayDeco = true;
    }

    // Recorre el trazo desde el último punto, llamando a fn cada "esp" píxeles
    function recorrer(c, lx, ly, esp, fn) {
      const last = c.lastTip;
      c.lastTip = { x: lx, y: ly };
      if (!last) {
        c.acc = 0;
        fn(lx, ly);
        return;
      }
      const dx = lx - last.x;
      const dy = ly - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.01) return;
      const ux = dx / dist;
      const uy = dy / dist;
      let t = esp - c.acc;
      while (t <= dist) {
        fn(last.x + ux * t, last.y + uy * t);
        t += esp;
      }
      c.acc = dist - (t - esp);
    }

    function pintar(c, tip) {
      const cake = s.cake;
      if (!cake) return;
      const lx = tip.x - cake.left;
      const ly = tip.y - cake.top;
      const id = c.step.id;

      if (id === "cubrir") {
        recorrer(c, lx, ly, ESP_CREMA, (x, y) => {
          if (enCake(x, y)) estamparCrema(x, y);
        });
        s.progreso = s.nValid ? clamp(s.nCov / (s.nValid * META_COBERTURA)) : 1;
      } else if (id === "manga") {
        recorrer(c, lx, ly, ESP_MANGA, (x, y) => {
          if (enCake(x, y)) {
            estamparEstrella(x, y);
            s.puntos++;
          }
        });
        s.progreso = clamp(s.puntos / META_PUNTOS);
      } else if (id === "grageas") {
        recorrer(c, lx, ly, ESP_GRAGEAS, (x, y) => {
          for (let i = 0; i < 3; i++) {
            const gx = x + rand(-16, 16);
            const gy = y + rand(-8, 18);
            if (enCake(gx, gy)) {
              estamparGragea(gx, gy);
              s.grageas++;
            }
          }
        });
        s.progreso = clamp(s.grageas / META_GRAGEAS);
      }
      if (s.progreso >= 1) completar(c);
    }

    function completar(c) {
      if (PASOS[s.paso]?.id === "cubrir") rellenarCrema();
      const ahora = performance.now();
      c.modo = "sale";
      c.t0 = ahora;
      s.paso++;
      s.progreso = 0;
      if (s.paso >= PASOS.length) {
        guardarPastel(exportarPastel()); // guarda la torta terminada para /finCompetencia
        s.fin = { t0: ahora };
        const cake = s.cake;
        const cols = ["#ffe27a", "#ffffff", "#ff9ec4", "#9be7ff"];
        for (let i = 0; i < 60; i++) {
          s.particulas.push({
            x: cake.x + rand(-cake.w / 2, cake.w / 2),
            y: cake.y + rand(-cake.h / 2, cake.h / 3),
            vx: rand(-0.4, 0.4),
            vy: -rand(0.3, 1.2),
            t0: ahora + rand(0, 900),
            dur: rand(1400, 2800),
            size: rand(12, 30),
            color: cols[(Math.random() * cols.length) | 0],
          });
        }
      }
    }

    // ---------- dibujo ----------
    function sprite(img, x, y, w, o = {}) {
      const { scale = 1, dx = 0, dy = 0, rot = 0, alpha = 1, sombra = 4 } = o;
      const h = (w * img.naturalHeight) / img.naturalWidth;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + dx, y + dy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = sombra * 2 * SC;
      ctx.shadowOffsetX = 3 * SC;
      ctx.shadowOffsetY = (sombra + 2) * SC;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    // Compone la decoración recortada con la máscara: nunca se sale del pastel
    function componerDeco() {
      const cc = s.compCtx;
      cc.globalCompositeOperation = "source-over";
      cc.clearRect(0, 0, s.comp.width, s.comp.height);
      cc.drawImage(s.deco, 0, 0);
      cc.globalCompositeOperation = "destination-in";
      cc.drawImage(s.mask, 0, 0);
    }

    function dibujarDeco() {
      const c = s.cake;
      if (!c || !s.hayDeco) return;
      componerDeco();
      ctx.drawImage(s.comp, c.left, c.top, c.w, c.h);
    }

    // La torta terminada como PNG transparente: SOLO el pastel (sin el plato),
    // recortada justo al borde, así su base queda en el borde inferior de la imagen.
    function exportarPastel() {
      if (!s.cake || !imgs.pastel || !s.maskAlpha) return null;
      try {
        const mw = s.comp.width;
        const mh = s.comp.height;
        const a = s.maskAlpha;

        // caja que rodea al pastel (según la máscara)
        let x0 = mw, y0 = mh, x1 = -1, y1 = -1;
        for (let y = 0; y < mh; y++) {
          for (let x = 0; x < mw; x++) {
            if (a[(y * mw + x) * 4 + 3] > 128) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < 0) return null;
        const m = CONTORNO_EXPORT;
        x0 = Math.max(0, x0 - m);
        y0 = Math.max(0, y0 - m);
        x1 = Math.min(mw - 1, x1 + m);
        y1 = Math.min(mh - 1, y1 + m);

        // máscara un poco más gruesa, para conservar el contorno del pastel
        const gruesa = document.createElement("canvas");
        gruesa.width = mw;
        gruesa.height = mh;
        const gg = gruesa.getContext("2d");
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          gg.drawImage(s.mask, Math.cos(ang) * m, Math.sin(ang) * m);
        }
        gg.drawImage(s.mask, 0, 0);

        // pastel (sin plato) + decoración
        const tmp = document.createElement("canvas");
        tmp.width = mw;
        tmp.height = mh;
        const tg = tmp.getContext("2d");
        tg.drawImage(imgs.pastel, 0, 0, mw, mh);
        tg.globalCompositeOperation = "destination-in";
        tg.drawImage(gruesa, 0, 0);
        tg.globalCompositeOperation = "source-over";
        if (s.hayDeco) {
          componerDeco();
          tg.drawImage(s.comp, 0, 0);
        }

        // recortar a la caja
        const ow = x1 - x0 + 1;
        const oh = y1 - y0 + 1;
        const out = document.createElement("canvas");
        out.width = ow;
        out.height = oh;
        out.getContext("2d").drawImage(tmp, x0, y0, ow, oh, 0, 0, ow, oh);
        return out.toDataURL("image/png");
      } catch {
        return null;
      }
    }

    function dibujarMano(ahora) {
      const c = s.mano;
      if (!c) return;
      const img = imgs[c.obj.id];
      if (!img) return;
      const w = toolW(c.obj);
      const home = homeDe(c.obj);
      let x = c.x, y = c.y, scale = 1, alpha = 1, sombra = 4, rot = 0;
      let tip = null;

      if (c.modo === "aparece") {
        const t = clamp((ahora - c.t0) / 300);
        scale = ease(t);
        alpha = t;
        y = c.y - 25 * (1 - ease(t));
        if (t >= 1) c.modo = "quieta";
      } else if (c.modo === "quieta") {
        y = c.y + Math.sin(ahora / 300) * 3; // pequeño balanceo: invita a arrastrar
      } else if (c.modo === "arrastre") {
        // la herramienta se acomoda para que su punta quede justo bajo el puntero
        const k = ease(clamp((ahora - c.snapT0) / 150));
        // el bowl de grageas se inclina; el resto de las herramientas no
        rot = c.step.id === "grageas" ? TILT_GRAGEAS * ease(clamp((ahora - c.snapT0) / TILT_MS)) : 0;
        c.rot = rot;
        const t = tipOff(c);
        // la punta, ya girada, tiene que quedar justo bajo el puntero
        const cs = Math.cos(rot), sn = Math.sin(rot);
        const rx = (t.dx * cs - t.dy * sn) * w;
        const ry = (t.dx * sn + t.dy * cs) * w;
        c.x = s.ptr.x + lerp(c.off0.dx, -rx, k);
        c.y = s.ptr.y + lerp(c.off0.dy, -ry, k);
        x = c.x;
        y = c.y;
        sombra = 10;
        tip = { x: x + rx, y: y + ry };
        if (k >= 1) pintar(c, tip);
        else c.lastTip = null;
      } else if (c.modo === "vuelve") {
        const t = ease(clamp((ahora - c.t0) / 250));
        x = c.x = lerp(c.desdeX, home.x, t);
        y = c.y = lerp(c.desdeY, home.y, t);
        rot = (c.rot ?? 0) * (1 - t); // se endereza mientras vuelve
        if (t >= 1) {
          c.modo = "quieta";
          c.rot = 0;
        }
      } else if (c.modo === "sale") {
        rot = c.rot ?? 0;
        alpha = 1 - clamp((ahora - c.t0) / 350);
        if (alpha <= 0) {
          s.mano = null;
          return;
        }
      }
      sprite(img, x, y, w, { scale, alpha, sombra, rot });

      if (DEBUG_PUNTA && tip) {
        ctx.save();
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function dibujar(ahora) {
      if (!vivo) return;
      ctx.clearRect(0, 0, W, H);
      if (imgs.fondo) ctx.drawImage(imgs.fondo, 0, 0, W, H);

      // objetos de la mesa (con animación al pasar el cursor)
      for (const o of OBJETOS) {
        const im = imgs[o.id];
        if (!im) continue;
        const elegido = s.elegido.crema === o.id || s.elegido.manga === o.id;
        const target = s.hover === o.id || elegido ? 1 : 0;
        const t = (s.hoverT[o.id] = (s.hoverT[o.id] ?? 0) + (target - (s.hoverT[o.id] ?? 0)) * 0.25);

        // sacudida si no es el objeto que toca
        let dx = 0;
        if (s.shake && s.shake.id === o.id) {
          const k = clamp((ahora - s.shake.t0) / 350);
          dx = Math.sin(k * Math.PI * 6) * 8 * (1 - k);
          if (k >= 1) s.shake = null;
        }

        sprite(im, px(o.x), py(o.y), px(o.w), {
          scale: 1 + 0.1 * t,
          dx,
          dy: -10 * t,
          rot: ((-3 * Math.PI) / 180) * t,
          sombra: 4 + 6 * t,
        });
      }

      // pastel + decoración
      const c = s.cake;
      if (c && imgs.pastel) {
        sprite(imgs.pastel, c.x, c.y, c.w, { sombra: 8 });
        dibujarDeco();
        if (DEBUG_MASK && s.mask) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.drawImage(s.mask, c.left, c.top, c.w, c.h);
          ctx.restore();
        }
      }

      dibujarMano(ahora);

      // brillitos de festejo
      for (const p of s.particulas) {
        const k = (ahora - p.t0) / p.dur;
        if (k < 0 || k > 1) continue;
        const dt = ahora - p.t0;
        ctx.save();
        ctx.globalAlpha = Math.sin(Math.PI * k);
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✦", p.x + p.vx * dt * 0.05, p.y + p.vy * dt * 0.05);
        ctx.restore();
      }

      // avisar a React
      if (s.fin && !s.finAvisado && ahora - s.fin.t0 > FIN_DELAY) {
        s.finAvisado = true;
        onFinRef.current?.();
      }
      if (s.paso !== s.repPaso) {
        s.repPaso = s.paso;
        onPasoRef.current?.(s.paso);
      }
      if (Math.abs(s.progreso - s.repProg) > 0.01 || (s.progreso === 0 && s.repProg !== 0)) {
        s.repProg = s.progreso;
        onProgresoRef.current?.(s.progreso);
      }
      raf = requestAnimationFrame(dibujar);
    }

    // ---------- entrada (mouse y touch) ----------
    const aLogicas = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    };

    const objetoBajo = (p) => {
      if (s.paso >= PASOS.length) return null;
      for (let i = OBJETOS.length - 1; i >= 0; i--) {
        if (dentro(rectObjeto(OBJETOS[i]), p.x, p.y)) return OBJETOS[i];
      }
      return null;
    };

    function onDown(e) {
      const p = aLogicas(e);
      s.ptr = p;
      if (s.paso >= PASOS.length) return;
      const c = s.mano;

      // 1) agarrar la herramienta que apareció
      if (c && c.modo === "quieta" && dentro(rectMano(), p.x, p.y)) {
        const t = tipOff(c);
        const w = toolW(c.obj);
        c.modo = "arrastre";
        c.off0 = { dx: c.x - p.x, dy: c.y - p.y };
        c.offT = { dx: -t.dx * w, dy: -t.dy * w };
        c.snapT0 = performance.now();
        c.lastTip = null;
        c.acc = 0;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
        return;
      }
      const o = objetoBajo(p);
      if (!o) return;
      if (c) return; // ya hay una herramienta en mano

      const step = PASOS[s.paso];
      if (step.objetos.includes(o.id)) {
        // elegir la crema: pasa directo al siguiente paso
        if (step.id === "crema") {
          s.elegido.crema = o.id;
          s.cremaCol = CREMAS[o.id];
          s.paso++;
          s.progreso = 0;
          return;
        }
        if (step.id === "manga") {
          s.elegido.manga = o.id;
          s.mangaCol = MANGAS[o.id];
        }
        const home = homeDe(o);
        s.mano = { obj: o, step, x: home.x, y: home.y, modo: "aparece", t0: performance.now(), lastTip: null, acc: 0 };
        return;
      }
      // objeto equivocado: se sacude
      s.shake = { id: o.id, t0: performance.now() };
    }

    function onMove(e) {
      const p = aLogicas(e);
      s.ptr = p;
      const c = s.mano;
      if (c && c.modo === "arrastre") return;
      const sobreMano = c && c.modo === "quieta" && dentro(rectMano(), p.x, p.y);
      const o = sobreMano ? null : objetoBajo(p);
      s.hover = o ? o.id : null;
      canvas.style.cursor = sobreMano ? "grab" : o ? "pointer" : "default";
    }

    function onUp(e) {
      const c = s.mano;
      if (!c || c.modo !== "arrastre") return;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = "default";
      c.modo = "vuelve";
      c.t0 = performance.now();
      c.desdeX = c.x;
      c.desdeY = c.y;
      c.lastTip = null;
    }

    function onLeave() {
      s.hover = null;
    }

    // Termina el paso actual (manga o grageas) antes de llegar a la meta (botón "Terminé")
    function terminarPaso() {
      const id = PASOS[s.paso]?.id;
      const hizoAlgo = id === "manga" ? s.puntos > 0 : id === "grageas" ? s.grageas > 0 : false;
      if (!hizoAlgo) return;
      canvas.style.cursor = "default";
      completar(s.mano ?? {});
    }
    if (terminarRef) terminarRef.current = terminarPaso;

    // ---------- arranque ----------
    (async () => {
      await Promise.all(
        Object.entries(SRC).map(async ([k, v]) => {
          imgs[k] = await cargar(v);
        })
      );
      prepararPastel();
      if (vivo) raf = requestAnimationFrame(dibujar);
    })();

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      vivo = false;
      if (terminarRef) terminarRef.current = null;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} width={W * SC} height={H * SC} className={styles.canvas} />;
}

// ---------- Lista de pasos (popup) ----------
function Pasos({ paso, progreso }) {
  const completa = paso >= PASOS.length;

  return (
    <aside className={styles.receta} aria-label="Pasos para decorar el pastel">
      <h2 className={styles.recetaTitulo}>
        Decorar
        <span className={styles.recetaCuenta}>
          {Math.min(paso, PASOS.length)}/{PASOS.length}
        </span>
      </h2>
      <ol className={styles.recetaLista}>
        {PASOS.map((r, i) => {
          const hecho = i < paso;
          const actual = i === paso;
          return (
            <li
              key={r.id}
              className={`${styles.paso} ${hecho ? styles.pasoHecho : ""} ${actual ? styles.pasoActual : ""}`}
              aria-current={actual ? "step" : undefined}
            >
              <span className={styles.tic} aria-hidden="true">
                {hecho && (
                  <svg viewBox="0 0 24 24" width="100%" height="100%">
                    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={styles.pasoNombre}>{r.nombre}</span>
              {actual && progreso > 0 && (
                <span className={styles.mini} aria-hidden="true">
                  <span className={styles.miniRelleno} style={{ width: `${Math.round(progreso * 100)}%` }} />
                </span>
              )}
              {hecho && <span className={styles.soloLectores}> (listo)</span>}
            </li>
          );
        })}
      </ol>
      {completa && <p className={styles.recetaFin}>¡Pastel decorado!</p>}
    </aside>
  );
}

function Instrucciones({ paso, fin }) {
  let titulo = "¡Paso 3: Decorar el pastel!";
  let mensaje = "Elegí la crema que más te guste para comenzar a decorar tu pastel.";

  if (paso === 1) {
    titulo = "¡A cubrir el pastel!";
    mensaje = "Utilizá la espátula para cubrir todo el pastel con la crema elegida.";
  }

  if (paso === 2) {
    titulo = "¡A darle un toque especial!";
    mensaje = "Decorá tu pastel con la manga y agregale detalles para hacerlo único.";
  }

  if (paso === 3) {
    titulo = "¡Los últimos detalles!";
    mensaje = "Agregá grageas para darle el toque final a tu pastel.";
  }

  if (paso >= 4 || fin) {
    titulo = "¡Pastel decorado!";
    mensaje = "¡Excelente trabajo! Tu pastel está terminado. Hacé clic en ¡Listo! para finalizar.";
  }

  return (
    <aside className={styles.instrucciones}>
      <h3 className={styles.instruccionesTitulo}>{titulo}</h3>
      <p className={styles.instruccionesTexto}>{mensaje}</p>
      <span className={styles.instruccionesDecoracion}></span>
    </aside>
  );
}

export default function DecorarPastelPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [fin, setFin] = useState(false);
  const terminarRef = useRef(null);

  // Aparece en la manga y en las grageas, apenas pusiste el primer adorno
  const puedeTerminar = (paso === PASO_MANGA || paso === PASO_GRAGEAS) && progreso > 0;

  return (
    <main className={styles.game}>
      <EscenaDecorar
        onPaso={setPaso}
        onProgreso={setProgreso}
        onFin={() => {
          setFin(true);
          // NUEVO: guarda el resultado en la base (UsuariosPorPartida.tiempo_total).
          // Si terminaron todos los jugadores, el servidor cierra la partida y calcula el ganador.
          // Si no hay partida en curso o falla el servidor, no pasa nada: el juego sigue igual.
          guardarResultado();
        }}
        terminarRef={terminarRef}
      />

      <Instrucciones paso={paso} fin={fin} />

      <Pasos paso={paso} progreso={progreso} />

      {/* Terminar la manga o las grageas antes de completar la barra */}
      {puedeTerminar && (
        <div className={styles.siguiente}>
          <Button type="button" onClick={() => terminarRef.current?.()}>
            <span>Terminé</span>
            <span aria-hidden="true">✓</span>
          </Button>
        </div>
      )}

      {/* Cuando terminás de decorar: botón abajo a la derecha */}
      {fin && (
        <div className={styles.siguiente}>
          <Button type="button" onClick={() => router.push(RUTA_FIN)}>
            <span>¡Listo!</span>
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      )}
    </main>
  );
}