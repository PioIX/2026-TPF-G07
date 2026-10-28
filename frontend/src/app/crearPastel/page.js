"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./crearPastel.module.css";

// Resolución lógica del canvas = tamaño de mesada.png
const W = 1885;
const H = 834;
const px = (p) => (p / 100) * W; // % del ancho -> px lógicos
const py = (p) => (p / 100) * H; // % del alto  -> px lógicos

// x, y = centro (% de la escena), w = ancho (% del ancho)
const OBJETOS = [
  { id: "harina",       src: "/objetos/harina.png",       x: 18,   y: 38, w: 13 },
  { id: "manteca",      src: "/objetos/manteca.png",      x: 13,   y: 62, w: 10 },
  { id: "azucar",       src: "/objetos/azucar.png",       x: 24,   y: 60, w: 10 },
  { id: "huevos",       src: "/objetos/huevos.png",       x: 10.5, y: 82, w: 11 },
  { id: "repasador",    src: "/objetos/repasador.png",    x: 22,   y: 80, w: 9 },
  { id: "bowl",         src: "/objetos/bowl.png",         x: 78,   y: 38, w: 17 },
  { id: "azucarMorena", src: "/objetos/azucarMorena.png", x: 90,   y: 36, w: 6.5 },
  { id: "bicarbonato",  src: "/objetos/bicarbonato.png",  x: 91,   y: 56, w: 7.5 },
  { id: "vainilla",     src: "/objetos/vainilla.png",     x: 75,   y: 60, w: 5.5 },
  { id: "chocolate",    src: "/objetos/chocolate.png",    x: 82,   y: 62, w: 8.5 },
  { id: "maicena",      src: "/objetos/maicena.png",      x: 84,   y: 80, w: 9.5 },
  { id: "polvoHornear", src: "/objetos/polvoHornear.png", x: 92,   y: 80, w: 6.5 },
];

// Bowl sobre el mantel
const BOWL_MANTEL = { x: 50, y: 52, w: 26 };
// Tamaño por defecto de lo que se arrastra (cuchara, huevo, etc.)
const TOOL_W = 9;

/*
 * RECETA: el orden de este array ES el orden del juego y del recetario.
 *  - nombre : lo que se lee en el recetario
 *  - objeto : id (de OBJETOS) en el que hay que hacer clic
 *  - tool   : imagen que aparece para arrastrar (/objetos/<tool>.png).
 *  - bowl   : imagen del bowl DESPUÉS de echar este ingrediente (/objetos/<bowl>.png)
 *  - toolW  : (opcional) ancho de lo que se arrastra, en % del ancho
 */
const RECETA = [
  { id: "azucar",   nombre: "Azúcar",              objeto: "azucar",       tool: "cucharaAzucar",   bowl: "bowlAzucar" },
  { id: "manteca",  nombre: "Manteca",             objeto: "manteca",      tool: "bloqueManteca",   bowl: "bowlAzucarManteca", toolW: 8, rotar: false },
  { id: "harina",   nombre: "Harina",              objeto: "harina",       tool: "cucharaHarina",   bowl: "bowlAzucarMantecaHarina" },
  { id: "huevo1",   nombre: "Huevo (1 de 2)",      objeto: "huevos",       tool: "huevo",           bowl: "bowlIngredientes1Huevo", toolW: 6, toolRoto: "huevoRoto", rotar: false },
  { id: "huevo2",   nombre: "Huevo (2 de 2)",      objeto: "huevos",       tool: "huevo",           bowl: "bowlIngredientes2Huevos", toolW: 6, toolRoto: "huevoRoto", rotar: false },
  { id: "polvo",    nombre: "Polvo para hornear",  objeto: "polvoHornear", tool: "cucharaPHornear", bowl: "bowlIngredientesPHornear" },
  { id: "vainilla", nombre: "Esencia de vainilla", objeto: "vainilla",     tool: "vainilla", bowl: "bowlIngredientesVainilla", toolW: 5.5, toolRoto: "vainillaArrastrable", cambioT: 0.05 },
];

/*
 * BATIDOR: aparece sobre la mesada cuando se completa la receta.
 */
const PASO_BATIDOR = {
  id: "batidor",
  tool: "batidor",
  toolW: 6, // ancho en % de la escena
  rotar: false,
  esBatidor: true,
  rotReposo: 0, // inclinación en reposo, en radianes
  home: { x: 78, y: 36 }, // % de la escena
};
const BATIDOR_DELAY = 1500; // ms entre el último ingrediente y la aparición del batidor
const BATIDO_MS = 3500; // duración de la mezcla
const VUELTAS = 6; // vueltas del batidor durante la mezcla

/*
 * BOCA del bowl, como fracción del tamaño del bowl en pantalla.
 * AJUSTALA A OJO con DEBUG_BOCA = true (se dibuja una elipse roja).
 *  - y  : altura de la boca respecto al centro del bowl
 *  - rx : semiancho de la boca
 *  - ry : semialto de la boca (menor que rx = perspectiva)
 */
const BOCA = { y: -0.10, rx: 0.42, ry: 0.32 };
const SWIRL_K = 0.25; // cuánto gira la masa respecto al batidor (más = más retorcida)
const DEBUG_BOCA = true; // poné false cuando ya la tengas ajustada

// Órbita del batidor: usa la misma boca, un poco más chica
const BATIDO_CFG = {
  centroY: BOCA.y - 0.08,
  radioX: BOCA.rx * 0.4,
  radioY: BOCA.ry * 0.3,
};

/*
 * TRANSICIÓN FINAL (cuando termina de batir):
 *  1) desaparecen el batidor, la elipse roja y los objetos de la mesada
 *  2) el bowl (con la masa) se desliza hacia BOWL_LADO
 *  3) aparece el molde (/objetos/molde.png) en MOLDE
 * Posiciones en % de la escena (centro) y ancho en % del ancho.
 */
const FIN_FADE_MS = 700; // desvanecer batidor + ingredientes
const BOWL_MOVE_DELAY = 300; // pausa antes de mover el bowl
const BOWL_MOVE_MS = 900; // duración del deslizamiento
const BOWL_LADO = { x: 20, y: 58, w: 20 }; // a dónde se va el bowl (a la izquierda)
const MOLDE = { x: 50, y: 52, w: 30 }; // dónde aparece el molde

// Trozos que orbitan por la boca y se deshacen (borrá el array para desactivarlos)
const TROZOS = [
  { color: "#f2b632", r: 0.55, fase: 0,   vel: 1.0, tam: 0.07 }, // yema
  { color: "#f6e27a", r: 0.35, fase: 2.1, vel: 1.4, tam: 0.06 }, // manteca
  { color: "#fffaf0", r: 0.75, fase: 4.2, vel: 0.8, tam: 0.08 }, // harina
  { color: "#f2b632", r: 0.65, fase: 5.4, vel: 1.2, tam: 0.06 }, // yema
];

// Todas las imágenes que usa el canvas
const SRC = {
  fondo: "/mesada.png",
  bowlMantel: "/objetos/bowlMantel.png",
  batidor: "/objetos/batidor.png",
  // Opcional: masa lisa. Si no existe, se usa un relleno color crema.
  bowlMasa: "/objetos/bowlMasa.png",
  molde: "/objetos/molde.png",
  ...Object.fromEntries(OBJETOS.map((o) => [o.id, o.src])),
};
for (const r of RECETA) {
  SRC[r.tool] = `/objetos/${r.tool}.png`;
  SRC[r.bowl] = `/objetos/${r.bowl}.png`;
  if (r.toolRoto) SRC[r.toolRoto] = `/objetos/${r.toolRoto}.png`;
}

const clamp = (v) => Math.min(Math.max(v, 0), 1);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

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

function EscenaMezcla({ onPaso, onBowl, onBatidor }) {
  const canvasRef = useRef(null);
  const onPasoRef = useRef(onPaso);
  const onBowlRef = useRef(onBowl);
  const onBatidorRef = useRef(onBatidor);
  onPasoRef.current = onPaso;
  onBowlRef.current = onBowl;
  onBatidorRef.current = onBatidor;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgs = {};
    let raf;
    let vivo = true;

    // Estado del juego (objeto normal: el loop del canvas no usa useState)
    const s = {
      bowlEnMantel: false,
      bowlT0: 0,
      paso: 0, // cuántos ingredientes ya están en el bowl
      finalT: 0, // momento en que se echó el último ingrediente
      batidorListo: false, // ya apareció el batidor
      batido: false, // ya terminó de mezclar
      reportado: 0, // último paso avisado a React
      hover: null,
      hoverT: {},
      shake: null, // { id, t0 } al hacer clic en un ingrediente equivocado
      cuchara: null, // { x, y, modo, t0, dx, dy, desdeX, desdeY, step, aplicado }
      bate: null, // { ang, prog } mientras se mezcla (y después)
      fin: null, // { t0 } cuando termina de batir
      moldeT0: 0, // momento en que aparece el molde
      bowl: { x: px(BOWL_MANTEL.x), y: py(BOWL_MANTEL.y), w: px(BOWL_MANTEL.w) }, // posición actual del bowl
    };

    // ---------- helpers de geometría ----------
    const rectDe = (im, cx, cy, wPx) =>
      im ? { x: cx, y: cy, w: wPx, h: (wPx * im.naturalHeight) / im.naturalWidth } : null;
    const dentro = (r, mx, my) =>
      r && Math.abs(mx - r.x) < r.w / 2 && Math.abs(my - r.y) < r.h / 2;

    // Imagen del bowl según el paso actual (si falta alguna, usa la anterior)
    const bowlImg = () => {
      if (s.batido && imgs.bowlMasa) return imgs.bowlMasa;
      for (let i = s.paso - 1; i >= 0; i--) {
        if (imgs[RECETA[i].bowl]) return imgs[RECETA[i].bowl];
      }
      return imgs.bowlMantel;
    };
    const rectBowl = () =>
      rectDe(bowlImg(), s.bowl.x, s.bowl.y, s.bowl.w);
    const rectObjeto = (o) => rectDe(imgs[o.id], px(o.x), py(o.y), px(o.w));

    const toolImg = (step) => imgs[step.tool] || imgs[step.objeto];
    const toolW = (step) => px(step.toolW ?? TOOL_W);
    // Dónde aparece (y a dónde vuelve) lo que se arrastra: junto al ingrediente, hacia el centro
    const homeDe = (step) => {
      if (step.home) return { x: px(step.home.x), y: py(step.home.y) };
      const o = OBJETOS.find((ob) => ob.id === step.objeto);
      return { x: px(o.x + (o.x < 50 ? 10 : -10)), y: py(o.y - 8) };
    };
    const rectCuchara = () => {
      const c = s.cuchara;
      return c ? rectDe(toolImg(c.step), c.x, c.y, toolW(c.step)) : null;
    };

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
      ctx.shadowBlur = sombra * 2;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = sombra + 2;
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    // Boca del bowl en píxeles lógicos, a partir del rectángulo del bowl
    const bocaDe = (b) => ({
      x: b.x,
      y: b.y + b.h * BOCA.y,
      rx: b.w * BOCA.rx,
      ry: b.h * BOCA.ry,
    });

    // Efecto de mezcla: remolino por anillos + masa lisa + trozos que se deshacen
    function mezclaBowl(fade = 1) {
      const b = rectBowl();
      if (!b || !s.bate) return;
      const boca = bocaDe(b);
      const { ang, prog } = s.bate;
      const k = boca.ry / boca.rx;
      const N = 10;
      const imgIng = imgs[RECETA[RECETA.length - 1].bowl]; // bowl con todos los ingredientes
      if (!imgIng) return;

      // (1) remolino por anillos: el centro gira más que el borde
      for (let i = 0; i < N; i++) {
        const r0 = i / N;
        const r1 = Math.min(1, (i + 1) / N + 0.02); // leve solape: evita costuras
        const rot = ang * SWIRL_K * (1 - r0);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.beginPath();
        ctx.ellipse(boca.x, boca.y, boca.rx * r1, boca.ry * r1, 0, 0, Math.PI * 2);
        if (i > 0) ctx.ellipse(boca.x, boca.y, boca.rx * r0, boca.ry * r0, 0, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.translate(boca.x, boca.y);
        ctx.scale(1, k);
        ctx.rotate(rot);
        ctx.scale(1, 1 / k);
        ctx.translate(-boca.x, -boca.y);
        ctx.drawImage(imgIng, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
        ctx.restore();
      }

      // (2) masa lisa que aparece con el progreso, solo dentro de la boca
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(boca.x, boca.y, boca.rx, boca.ry, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = prog * fade;
      if (imgs.bowlMasa) {
        ctx.drawImage(imgs.bowlMasa, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      } else {
        ctx.fillStyle = "#f3dfa8"; // crema
        ctx.fill();
      }
      ctx.restore();

      // (3) trozos que orbitan y se deshacen
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(boca.x, boca.y, boca.rx, boca.ry, 0, 0, Math.PI * 2);
      ctx.clip();
      for (const t of TROZOS) {
        const a = ang * t.vel + t.fase;
        const esc = 1 - ease(seg(prog, 0.2, 0.95));
        if (esc <= 0) continue;
        ctx.globalAlpha = esc * fade;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.ellipse(
          boca.x + Math.cos(a) * boca.rx * t.r,
          boca.y + Math.sin(a) * boca.ry * t.r,
          b.w * t.tam * esc,
          b.w * t.tam * esc * k,
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();

      if (DEBUG_BOCA && !s.fin) {
        ctx.save();
        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(boca.x, boca.y, boca.rx, boca.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function dibujarCuchara(ahora) {
      const c = s.cuchara;
      if (!c) return;
      const img = toolImg(c.step);
      if (!img) return;
      const home = homeDe(c.step);
      let x = c.x, y = c.y, rot = c.step.rotReposo ?? 0, scale = 1, alpha = 1, sombra = 4;
      let imgRoto = null;

      if (c.modo === "aparece") {
        const t = clamp((ahora - c.t0) / 300);
        scale = ease(t);
        alpha = t;
        y = c.y - 25 * (1 - ease(t));
        if (t >= 1) c.modo = "quieta";
      } else if (c.modo === "quieta") {
        y = c.y + Math.sin(ahora / 300) * 3; // pequeño balanceo: invita a arrastrar
      } else if (c.modo === "arrastre") {
        scale = 1.1;
        sombra = 10;
      } else if (c.modo === "vuelve") {
        const t = ease(clamp((ahora - c.t0) / 250));
        x = c.x = lerp(c.desdeX, home.x, t);
        y = c.y = lerp(c.desdeY, home.y, t);
        if (t >= 1) c.modo = "quieta";
      } else if (c.modo === "vierte") {
        const t = clamp((ahora - c.t0) / 700);
        const b = rectBowl();
        const destX = px(BOWL_MANTEL.x) + 20;
        const destY = b ? b.y - b.h * 0.45 : py(BOWL_MANTEL.y);
        const mueve = ease(seg(t, 0, 0.5));
        x = lerp(c.desdeX, destX, mueve);
        y = lerp(c.desdeY, destY, mueve);
        if (c.step.rotar !== false) rot = -0.9 * ease(seg(t, 0.4, 0.8)); // cuchara: se inclina
        alpha = 1 - seg(t, 0.8, 1);
        sombra = 10;
        // huevo / vainilla: al soltarlo sobre el bowl se cambia a la otra imagen (toolRoto)
        if (t >= (c.step.cambioT ?? 0.4) && c.step.toolRoto && imgs[c.step.toolRoto]) imgRoto = imgs[c.step.toolRoto];
        if (t >= 0.7 && !c.aplicado) {
          c.aplicado = true;
          s.paso++; // el bowl cambia a la imagen con este ingrediente
          if (s.paso >= RECETA.length) s.finalT = performance.now();
        }
        if (t >= 1) s.cuchara = null;
      } else if (c.modo === "bate") {
        // El batidor entra al bowl y da vueltas con una órbita elíptica.
        // El ángulo avanza con ease(): arranca lento, acelera y frena al final.
        const t = clamp((ahora - c.t0) / BATIDO_MS);
        const b = rectBowl();
        const cx = px(BOWL_MANTEL.x);
        const cy = b ? b.y + b.h * BATIDO_CFG.centroY : py(BOWL_MANTEL.y);
        const rx = b ? b.w * BATIDO_CFG.radioX : 40;
        const ry = b ? b.h * BATIDO_CFG.radioY : 15;
        const entra = ease(seg(t, 0, 0.12)); // del lugar donde lo soltaste al centro
        const ang = ease(t) * VUELTAS * Math.PI * 2;

        x = lerp(c.desdeX, cx + rx * Math.cos(ang), entra);
        y = lerp(c.desdeY, cy + ry * Math.sin(ang), entra);
        // el mango se inclina según para dónde va la cabeza del batidor
        rot = lerp(c.step.rotReposo ?? 0, -0.28 * Math.cos(ang), entra);
        sombra = 8;

        // el remolino, la masa y los trozos dependen del mismo ang y de prog
        s.bate = { ang, prog: ease(seg(t, 0.1, 0.95)) };

        if (t >= 1) {
          s.batido = true;
          s.bate.prog = 1;
          c.modo = "fin"; // el batidor se queda un instante y se desvanece
          s.fin = { t0: ahora };
          c.x = cx;
          c.y = cy;
        }
      }
      // modo "fin": quieto en (c.x, c.y) y se desvanece
      if (c.modo === "fin" && s.fin) {
        alpha = 1 - ease(clamp((ahora - s.fin.t0) / FIN_FADE_MS));
        if (alpha <= 0) {
          s.cuchara = null;
          return;
        }
      }
      sprite(imgRoto || img, x, y, toolW(c.step), { scale, rot, alpha, sombra });
    }

    function dibujar(ahora) {
      if (!vivo) return;
      ctx.clearRect(0, 0, W, H);
      if (imgs.fondo) ctx.drawImage(imgs.fondo, 0, 0, W, H);

      // transición final: desaparecen los objetos de la mesa -> se mueve el bowl -> aparece el molde
      let kFade = 0;
      if (s.fin) {
        const dt = ahora - s.fin.t0;
        kFade = ease(clamp(dt / FIN_FADE_MS));
        const m = ease(clamp((dt - FIN_FADE_MS - BOWL_MOVE_DELAY) / BOWL_MOVE_MS));
        s.bowl.x = lerp(px(BOWL_MANTEL.x), px(BOWL_LADO.x), m);
        s.bowl.y = lerp(py(BOWL_MANTEL.y), py(BOWL_LADO.y), m);
        s.bowl.w = lerp(px(BOWL_MANTEL.w), px(BOWL_LADO.w), m);
        if (m >= 1 && !s.moldeT0) s.moldeT0 = ahora;
      }

      // objetos de la mesa (con animación al pasar el cursor)
      for (const o of OBJETOS) {
        if (o.id === "bowl" && s.bowlEnMantel) continue;
        const im = imgs[o.id];
        if (!im || kFade >= 1) continue;
        const target = s.hover === o.id ? 1 : 0;
        const t = (s.hoverT[o.id] = (s.hoverT[o.id] ?? 0) + (target - (s.hoverT[o.id] ?? 0)) * 0.25);

        // sacudida si no es el ingrediente que toca
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
          rot: (-3 * Math.PI) / 180 * t,
          sombra: 4 + 6 * t,
          alpha: 1 - kFade,
        });
      }

      // bowl sobre el mantel (cae al aparecer)
      if (s.bowlEnMantel) {
        const im = bowlImg();
        const t = ease(clamp((ahora - s.bowlT0) / 500));
        const o = { alpha: t, dy: -60 * (1 - t), scale: 0.85 + 0.15 * t, sombra: 6 };
        if (im) sprite(im, s.bowl.x, s.bowl.y, s.bowl.w, o);
      }

      // efecto de mezcla sobre el bowl (si hay bowlMasa.png, al terminar lo dibuja el propio bowl)
      if (s.bate && !(s.batido && imgs.moldeVacio)) mezclaBowl();

      // molde: cae al centro cuando el bowl ya se fue al costado
      if (s.moldeT0 && imgs.moldeVacio) {
        const t = ease(clamp((ahora - s.moldeT0) / 500));
        sprite(imgs.moldeVacio, px(MOLDE.x), py(MOLDE.y), px(MOLDE.w), {
          alpha: t,
          dy: -60 * (1 - t),
          scale: 0.85 + 0.15 * t,
          sombra: 6,
        });
      }

      // receta completa: aparece el batidor en el lugar del recetario
      if (s.finalT && !s.batidorListo && !s.cuchara && ahora - s.finalT > BATIDOR_DELAY) {
        s.batidorListo = true;
        const home = homeDe(PASO_BATIDOR);
        s.cuchara = { x: home.x, y: home.y, modo: "aparece", t0: ahora, step: PASO_BATIDOR, aplicado: false };
        onBatidorRef.current?.();
      }

      dibujarCuchara(ahora); // siempre al final: queda por encima de todo

      // avisar a React para que tilde el recetario
      if (s.paso !== s.reportado) {
        s.reportado = s.paso;
        onPasoRef.current?.(s.paso);
      }
      raf = requestAnimationFrame(dibujar);
    }

    // ---------- acciones ----------
    function verter() {
      const c = s.cuchara;
      c.modo = c.step.esBatidor ? "bate" : "vierte";
      c.t0 = performance.now();
      c.desdeX = c.x;
      c.desdeY = c.y;
    }

    function volver() {
      const c = s.cuchara;
      c.modo = "vuelve";
      c.t0 = performance.now();
      c.desdeX = c.x;
      c.desdeY = c.y;
    }

    // ---------- entrada (mouse y touch) ----------
    const aLogicas = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    };

    const objetoBajo = (p) => {
      if (s.fin) return null;
      for (let i = OBJETOS.length - 1; i >= 0; i--) {
        const o = OBJETOS[i];
        if (o.id === "bowl" && s.bowlEnMantel) continue;
        if (dentro(rectObjeto(o), p.x, p.y)) return o;
      }
      return null;
    };

    function onDown(e) {
      const p = aLogicas(e);
      const c = s.cuchara;

      // 1) agarrar lo que aparece (cuchara, huevo, batidor...)
      if (c && c.modo === "quieta" && dentro(rectCuchara(), p.x, p.y)) {
        c.modo = "arrastre";
        c.dx = c.x - p.x;
        c.dy = c.y - p.y;
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
        return;
      }
      // 2) clic en el bowl con el ingrediente (o el batidor) listo: lo echa / bate
      if (c && c.modo === "quieta" && s.bowlEnMantel && dentro(rectBowl(), p.x, p.y)) {
        verter();
        return;
      }
      const o = objetoBajo(p);
      if (!o) return;

      // 3) clic en el bowl de la derecha: pasa al mantel
      if (o.id === "bowl") {
        s.bowlEnMantel = true;
        s.bowlT0 = performance.now();
        onBowlRef.current?.(); // React muestra el recetario
        return;
      }
      if (c) return; // ya hay un ingrediente en mano

      // 4) clic en el ingrediente que toca: aparece lo que se arrastra
      const step = RECETA[s.paso];
      if (step && o.id === step.objeto) {
        const home = homeDe(step);
        s.cuchara = { x: home.x, y: home.y, modo: "aparece", t0: performance.now(), step, aplicado: false };
        return;
      }
      // 5) otro ingrediente (o receta terminada): se sacude
      s.shake = { id: o.id, t0: performance.now() };
    }

    function onMove(e) {
      const p = aLogicas(e);
      const c = s.cuchara;
      if (c && c.modo === "arrastre") {
        c.x = p.x + c.dx;
        c.y = p.y + c.dy;
        return;
      }
      const sobreCuchara = c && c.modo === "quieta" && dentro(rectCuchara(), p.x, p.y);
      const o = sobreCuchara ? null : objetoBajo(p);
      s.hover = o ? o.id : null;
      canvas.style.cursor = sobreCuchara ? "grab" : o ? "pointer" : "default";
    }

    function onUp(e) {
      const c = s.cuchara;
      if (!c || c.modo !== "arrastre") return;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = "default";
      if (s.bowlEnMantel && dentro(rectBowl(), c.x, c.y)) verter();
      else volver();
    }

    function onLeave() {
      s.hover = null;
    }

    // ---------- arranque ----------
    (async () => {
      await Promise.all(
        Object.entries(SRC).map(async ([k, v]) => {
          imgs[k] = await cargar(v);
        })
      );
      if (vivo) raf = requestAnimationFrame(dibujar);
    })();

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />;
}

// ---------- Recetario (popup) ----------
// Aparece arriba a la derecha (zona de la repisa) cuando el bowl llega al mantel.
// Cuando la receta se completa, en su lugar aparece el batidor (dentro del canvas).
function Recetario({ paso }) {
  const completa = paso >= RECETA.length;

  return (
    <aside className={styles.receta} aria-label="Receta del pastel">
      <h2 className={styles.recetaTitulo}>
        Ingredientes
        <span className={styles.recetaCuenta}>
          {Math.min(paso, RECETA.length)}/{RECETA.length}
        </span>
      </h2>
      <ol className={styles.recetaLista}>
        {RECETA.map((r, i) => {
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
              {hecho && <span className={styles.soloLectores}> (listo)</span>}
            </li>
          );
        })}
      </ol>
      {completa && <p className={styles.recetaFin}>¡Mezcla lista!</p>}
    </aside>
  );
}

export default function CrearPastelPage() {
  const [mezclando, setMezclando] = useState(false);
  const [bowlListo, setBowlListo] = useState(false);
  const [batidorListo, setBatidorListo] = useState(false);
  const [paso, setPaso] = useState(0);

  return (
    <main className={`${styles.game} ${mezclando ? styles.gameMezcla : ""}`}>
      {/* Escena 1: bowl como botón */}
      {!mezclando && (
        <button
          type="button"
          className={styles.bowl}
          onClick={() => setMezclando(true)}
          aria-label="Bowl"
        >
          <img src="/objetos/bowl.png" alt="" />
        </button>
      )}

      {/* Escena 2: todo dibujado en canvas */}
      {mezclando && (
        <>
          <EscenaMezcla
            onPaso={setPaso}
            onBowl={() => setBowlListo(true)}
            onBatidor={() => setBatidorListo(true)}
          />
          {bowlListo && !batidorListo && <Recetario paso={paso} />}
        </>
      )}
    </main>
  );
}