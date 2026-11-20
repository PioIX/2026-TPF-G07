"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./crearPastel.module.css";
import Button from "@/components/Button"; // ajustá la ruta a donde esté tu componente
import { leerPartida } from "@/lib/partida"; // lee qué torta se está haciendo en la partida actual
import { tortaDe } from "@/lib/tortas"; // imágenes y video de cada torta
import { registrarPuntos } from "@/lib/puntos";

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
 * RECETAS: tus arrays de siempre, ahora una por torta.
 * El orden de este array ES el orden del juego y del recetario.
 *  - nombre : lo que se lee en el recetario
 *  - objeto : id (de OBJETOS) en el que hay que hacer clic
 *  - tool   : imagen que aparece para arrastrar (/objetos/<tool>.png).
 *  - bowl   : imagen del bowl DESPUÉS de echar este ingrediente (/objetos/<bowl>.png)
 *  - toolW  : (opcional) ancho de lo que se arrastra, en % del ancho
 *
 * OJO: los nombres de archivo tienen que coincidir EXACTO con los de /public/objetos/
 * (mayúsculas incluidas), porque en Linux / Vercel "Bowl" y "bowl" son archivos distintos.
 */
const RECETA_VAINILLA = [
  { id: "azucar",   nombre: "Azúcar",              objeto: "azucar",       tool: "cucharaAzucar",   bowl: "bowlAzucar" },
  { id: "manteca",  nombre: "Manteca",             objeto: "manteca",      tool: "bloqueManteca",   bowl: "bowlAzucarManteca", toolW: 8, rotar: false },
  { id: "harina",   nombre: "Harina",              objeto: "harina",       tool: "cucharaHarina",   bowl: "bowlAzucarMantecaHarina" },
  { id: "huevo1",   nombre: "Huevo (1 de 2)",      objeto: "huevos",       tool: "huevo",           bowl: "bowlIngredientes1Huevo", toolW: 6, toolRoto: "huevoRoto", rotar: false },
  { id: "huevo2",   nombre: "Huevo (2 de 2)",      objeto: "huevos",       tool: "huevo",           bowl: "bowlIngredientes2Huevos", toolW: 6, toolRoto: "huevoRoto", rotar: false },
  { id: "polvo",    nombre: "Polvo para hornear",  objeto: "polvoHornear", tool: "cucharaPHornear", bowl: "bowlIngredientesPHornear" },
  { id: "vainilla", nombre: "Esencia de vainilla", objeto: "vainilla",     tool: "vainilla", bowl: "bowlIngredientesVainilla", toolW: 5.5, toolRoto: "vainillaArrastrable", cambioT: 0.05 },
];

// Torta de chocolate. Usa ingredientes que ya están en la mesada (azúcar morena,
// chocolate, bicarbonato). Si falta alguna imagen, el juego igual funciona:
// la herramienta usa la imagen del ingrediente y el bowl se queda con la anterior.
const RECETA_CHOCOLATE = [
  { id: "azucarM",        nombre: "Azúcar morena",      objeto: "azucarMorena", tool: "cucharaAMorena",         bowl: "bowlAzucarM" },
  { id: "manteca",        nombre: "Manteca",            objeto: "manteca",      tool: "bloqueManteca",          bowl: "bowlAMmanteca", toolW: 8, rotar: false },
  { id: "harina",         nombre: "Harina",             objeto: "harina",       tool: "cucharaHarina",          bowl: "bowlAMHarinaM" },
  { id: "maicena",        nombre: "Maicena",            objeto: "maicena",      tool: "cucharaAzucar",          bowl: "bowlIngredientesMaicena" },
  { id: "huevo1",         nombre: "Huevo (1 de 2)",     objeto: "huevos",       tool: "huevo",                  bowl: "BowlMaicena1Huevo",  toolW: 6, toolRoto: "huevoRoto", rotar: false },
  { id: "huevo2",         nombre: "Huevo (2 de 2)",     objeto: "huevos",       tool: "huevo",                  bowl: "BowlMaicena2Huevos", toolW: 6, toolRoto: "huevoRoto", rotar: false },
  { id: "polvoDeHornear", nombre: "Polvo para hornear", objeto: "polvoHornear", tool: "cucharitaPHornear",      bowl: "BowlPolvoPHorenar" },
  { id: "bicarbonato",    nombre: "Bicarbonato",        objeto: "bicarbonato",  tool: "cucharaditaBicarbonato", bowl: "Bowlbicarbonato" },
  { id: "chocolate",      nombre: "Chocolate",          objeto: "chocolate",    tool: "chocolateArrastrable",   bowl: "bowlChocolate" },
];

// Recetas por id de torta (Tortas.id_torta). La partida guarda qué torta se juega.
const RECETAS = {
  1: RECETA_VAINILLA, // vainilla
  2: RECETA_CHOCOLATE, // chocolate
};

// Devuelve la receta de la torta; si no existe (o no hay partida), usa la de vainilla.
// Así el juego nunca se rompe.
const recetaDe = (idTorta) => RECETAS[idTorta] ?? RECETA_VAINILLA;

// Textos que cambian según la torta: título del recetario y cuadro de instrucciones.
const INFO_TORTA = {
  1: {
    nombre: "Torta de vainilla",
    inicio: "¡Vamos a hacer una torta de vainilla! Hacé clic en el bowl para ponerlo sobre el mantel.",
    ingredientes: "Seguí la receta en orden: empezá por el azúcar y terminá con la esencia de vainilla. Hacé clic en el ingrediente y arrastralo al bowl.",
  },
  2: {
    nombre: "Torta de chocolate",
    // Masa lisa del final y colores de la mezcla: marrón en vez de crema vainilla
    masa: "/objetos/bowlMasaChoco.png",
    // El video de servir la masa (video y videoBowl) sale de tortas.js, como el de vainilla.
    // Si el video no carga, el juego usa la animación del molde + chorro.
    // Al terminar el video, se funde a la mesada con este molde ya lleno (ver MOLDE_FINAL).
    moldeFinal: "/objetos/moldeChoco.png",
    colorMasa: "#5a3319",
    trozos: [
      { color: "#5a3319", r: 0.55, fase: 0,   vel: 1.0, tam: 0.07 }, // chocolate
      { color: "#8a5a35", r: 0.35, fase: 2.1, vel: 1.4, tam: 0.06 }, // azúcar morena
      { color: "#3b2212", r: 0.75, fase: 4.2, vel: 0.8, tam: 0.08 }, // cacao oscuro
      { color: "#6f4426", r: 0.65, fase: 5.4, vel: 1.2, tam: 0.06 }, // marrón medio
    ],
    inicio: "¡Vamos a hacer una torta de chocolate! Hacé clic en el bowl para ponerlo sobre el mantel.",
    ingredientes: "Seguí la receta en orden: empezá por el azúcar morena y terminá con el chocolate. Hacé clic en el ingrediente y arrastralo al bowl.",
  },
};
const infoDe = (idTorta) => INFO_TORTA[idTorta] ?? INFO_TORTA[1];
const TEXTO_BATIDOR = "¡Mezcla lista! Arrastrá el batidor al bowl (o hacé clic en el bowl) para batir.";

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
 */
const BOCA = { x: 0, y: -0.10, rx: 0.42, ry: 0.32 }; // valor de respaldo
// La boca se calcula sola a partir de la parte visible de bowlMantel.png (centrada en el
// borde real del bowl). `ancho` = qué parte del ancho visible ocupa la elipse (0.93 = un poco
// por dentro del borde); `arriba` = separación entre el borde superior del bowl y la elipse.
// Si igual querés ajustarla a mano, ponele `boca: { x, y, rx, ry }` a la torta en INFO_TORTA.
// `aspecto` = alto / ancho de la elipse en píxeles; `dx` = corrimiento horizontal (fracción del ancho).
// Valores medidos sobre una captura del bowl vacío en la pantalla completa.
const BOCA_AJUSTE = { ancho: 0.90, arriba: 0.025, aspecto: 0.61, dx: 0 };
const SWIRL_K = 0.25; // cuánto gira la masa respecto al batidor (más = más retorcida)
const DEBUG_BOCA = false; // poné true para ver la elipse roja y ajustarla

// Órbita del batidor: usa la misma boca, un poco más chica
const BATIDO_CFG = {
  subeY: -0.08, // el centro de la órbita queda un poco más arriba que el centro de la boca
  kRadioX: 0.4, // radio de la órbita = esta fracción del radio de la boca
  kRadioY: 0.3,
};

/*
 * TRANSICIÓN FINAL (cuando termina de batir):
 *  1) desaparecen el batidor y los objetos de la mesada
 *  2) el bowl (con la masa) se desliza hacia BOWL_LADO
 *  3) el VIDEO de servir la masa se funde encima de la escena.
 *     El molde NO es una imagen: lo trae el propio video, que arranca con el mantel
 *     vacío y el bowl a la izquierda (justo donde quedó el bowl del juego).
 */
const FIN_FADE_MS = 700; // desvanecer batidor + ingredientes
const BOWL_MOVE_DELAY = 300; // pausa antes de mover el bowl
const BOWL_MOVE_MS = 900; // duración del deslizamiento
const BOWL_LADO = { x: 20, y: 58, w: 20 }; // a dónde se va el bowl (a la izquierda, sobre el mantel)

/*
 * VIDEO DE SERVIR LA MASA
 *  - El video y la imagen de la masa salen de src/lib/tortas.js (uno por torta).
 *    VIDEO_SRC queda solo como valor de respaldo.
 *  - VIDEO_DELAY   : pausa (ms) entre que el bowl llega al costado y empieza el fundido
 *  - VIDEO_FADE_MS : fundido de entrada del video sobre la escena. El video se queda
 *                    quieto en su primer cuadro mientras se funde y recién después
 *                    se reproduce (así el fundido no se come el comienzo de la acción).
 *                    Durante ese tiempo el bowl del juego se acomoda (tamaño y lugar)
 *                    al bowl del video, para que el cambio no se note.
 *  - VIDEO_K_MAX   : cuánto se puede agrandar el video, como máximo, para calzar el bowl
 *                    (1 = justo para cubrir el canvas)
 *  - VIDEO_ALIGN_Y : solo valor de respaldo (0 = se recorta por abajo, 1 = por arriba)
 *
 * Al cargar, el video se MUEVE y escala solo para que su bowl (videoBowl de la torta) caiga
 * sobre el bowl del juego (BOWL_LADO). El video es 16:9 y el canvas es más ancho, así que
 * sobra alto: se recorta arriba/abajo.
 */
const VIDEO_SRC = "/objetos/servirMezcla.mp4";
const VIDEO_DELAY = 600;
const VIDEO_FADE_MS = 1200;
const VIDEO_K_MAX = 1.3;
const VIDEO_ALIGN_Y = 0.5;
const VIDEO_W = 1920; // tamaño real del video (los dos videos ya están procesados a 1920x1080)
const VIDEO_H = 1080;

// Escala mínima: el video cubre todo el canvas sin deformarse
const KMIN = Math.max(W / VIDEO_W, H / VIDEO_H);
const VX0 = (W - VIDEO_W * KMIN) / 2;
const VY0 = (H - VIDEO_H * KMIN) * VIDEO_ALIGN_Y;

/*
 * Dónde está el bowl en el primer cuadro del video, en píxeles del video (1920x1080).
 * Este es el valor de respaldo (vainilla); cada torta tiene el suyo en tortas.js.
 * Si cambiás el video, medilo de nuevo (activá DEBUG_VIDEO para ver si calza).
 */
const VIDEO_BOWL = { x0: 123, y0: 468, x1: 540, y1: 814 };
// true dibuja el bowl del video (magenta) y el bowl visible del juego (celeste)
const DEBUG_VIDEO = false;

// Retraso (ms) entre que termina el video y aparece el botón "Paso 2"
const BOTON_DELAY = 500;
// Ruta a la que lleva el botón
const RUTA_PASO_2 = "/competencia2";

/*
 * CIERRE (solo en las tortas con `moldeFinal`, como la de chocolate):
 * cuando termina el video, la mesada vacía (mesada.png) y el molde con la masa se funden
 * encima del último cuadro. Recién cuando termina el fundido aparece el botón "Paso 2".
 *  - MOLDE_FINAL : dónde queda el molde (% de la escena; x, y = centro, w = ancho).
 *                  Si lo ves corrido o de otro tamaño, ajustá estos tres números.
 *  - CIERRE_PAUSA: ms que se queda el último cuadro del video antes de empezar el fundido
 *  - CIERRE_MS   : duración del fundido
 */
const MOLDE_FINAL = { x: 50, y: 57, w: 33 };
const CIERRE_PAUSA = 400;
const CIERRE_MS = 1000;

/*
 * SERVIR LA MASA SIN VIDEO (solo de respaldo: si el video no carga o la torta no tiene)
 * Usa moldeVacio.png y moldeRelleno.png: aparece el molde, el bowl se inclina sobre él,
 * cae un chorro de masa, el molde se "llena" y el bowl vuelve a su lugar.
 * Para forzarla en una torta, ponele `servir: "animacion"` en INFO_TORTA.
 *  - SERVIR_MOLDE : dónde queda el molde (% de la escena; x, y = centro, w = ancho)
 *  - SERVIR_BOWL  : dónde se pone el bowl para verter (mismas unidades)
 *  - SERVIR_INCLINA : cuánto se inclina el bowl, en radianes
 *  - SERVIR_T     : duración (ms) de cada etapa
 */
const SERVIR_MOLDE = { x: 64, y: 62, w: 24 };
const SERVIR_BOWL = { x: 52, y: 34, w: 20 };
const SERVIR_INCLINA = 0.95;
const SERVIR_T = { molde: 700, inclina: 900, vierte: 2000, endereza: 900, pausa: 500 };

// Trozos que orbitan por la boca y se deshacen (borrá el array para desactivarlos)
const TROZOS = [
  { color: "#f2b632", r: 0.55, fase: 0,   vel: 1.0, tam: 0.07 }, // yema
  { color: "#f6e27a", r: 0.35, fase: 2.1, vel: 1.4, tam: 0.06 }, // manteca
  { color: "#fffaf0", r: 0.75, fase: 4.2, vel: 0.8, tam: 0.08 }, // harina
  { color: "#f2b632", r: 0.65, fase: 5.4, vel: 1.2, tam: 0.06 }, // yema
];

// Imágenes fijas que usa el canvas (las de cada paso de la receta se suman después,
// en srcDeReceta, porque dependen de la torta que se esté haciendo)
const SRC_BASE = {
  fondo: "/mesada.png",
  bowlMantel: "/objetos/bowlMantel.png",
  batidor: "/objetos/batidor.png",
  // Opcional: masa lisa. Si no existe, se usa un relleno color crema.
  bowlMasa: "/objetos/bowlMasa.png",
  // Molde para la animación de servir la masa (cuando no se usa video)
  moldeVacio: "/objetos/moldeVacio.png",
  moldeRelleno: "/objetos/moldeRelleno.png",
  ...Object.fromEntries(OBJETOS.map((o) => [o.id, o.src])),
};

// Lista completa de imágenes a cargar: las fijas + las de cada paso de la receta
// `masa` = imagen del bowl con la masa lista de la torta (tortas.js)
function srcDeReceta(receta, masa) {
  const src = { ...SRC_BASE, bowlMasa: masa ?? SRC_BASE.bowlMasa };
  for (const r of receta) {
    src[r.tool] = `/objetos/${r.tool}.png`;
    if (r.bowl) src[r.bowl] = `/objetos/${r.bowl}.png`;
    if (r.toolRoto) src[r.toolRoto] = `/objetos/${r.toolRoto}.png`;
  }
  return src;
}

const clamp = (v) => Math.min(Math.max(v, 0), 1);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// Estado de la animación de servir la masa, a partir del tiempo (ms) desde que empezó
function servirEstado(dt) {
  const T = SERVIR_T;
  const a1 = T.molde;
  const a2 = a1 + T.inclina;
  const a3 = a2 + T.vierte;
  const a4 = a3 + T.endereza;
  return {
    molde: ease(seg(dt, 0, a1)), // aparece el molde
    mueve: ease(seg(dt, a1, a2)) * (1 - ease(seg(dt, a3, a4))), // bowl: va y vuelve (0 -> 1 -> 0)
    lleno: ease(seg(dt, a2 + 300, a3)), // el molde se llena / el bowl se vacía
    chorroFin: ease(seg(dt, a2 + 100, a2 + 600)), // el chorro sale del bowl...
    chorroIni: ease(seg(dt, a3 - 400, a3)), // ...y se corta al final
    fin: dt >= a4 + T.pausa,
  };
}

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

// Rectángulo visible (alfa > 40) de una imagen, como fracción de su ancho/alto (0 a 1)
function bboxOpaco(img) {
  if (!img) return null;
  const cw = 400;
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
    return null;
  }
  let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (data[(y * cw + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x0: x0 / cw, y0: y0 / ch, x1: (x1 + 1) / cw, y1: (y1 + 1) / ch };
}

const entre = (v, a, b) => Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b));

// Boca del bowl (centro y radios, como fracción del tamaño de la imagen; x e y son el
// desplazamiento respecto del centro de la imagen). Se centra en el bowl visible,
// así no depende de los márgenes transparentes de cada imagen.
function bocaAuto(img) {
  const bb = bboxOpaco(img);
  if (!bb) return null;
  const ar = img.naturalHeight / img.naturalWidth;
  const rx = ((bb.x1 - bb.x0) / 2) * BOCA_AJUSTE.ancho;
  const ry = (rx * BOCA_AJUSTE.aspecto) / ar; // fracción del alto de la imagen
  return {
    x: (bb.x0 + bb.x1) / 2 - 0.5 + BOCA_AJUSTE.dx,
    y: bb.y0 + BOCA_AJUSTE.arriba + ry - 0.5,
    rx,
    ry,
  };
}

// Calza el video con el bowl del juego: elige escala y posición para que el bowl del primer
// cuadro caiga sobre el bowl visible de la imagen en BOWL_LADO (sin dejar bordes vacíos).
// Devuelve además dónde tiene que quedar el bowl del juego para coincidir al 100% con el
// del video (bowlFin): el juego lo acomoda mientras se funde el video.
// `vb` = dónde está el bowl en el primer cuadro del video de esta torta (tortas.js / INFO_TORTA)
function calzarVideo(imgBowl, vb = VIDEO_BOWL) {
  const base = { vt: { x: VX0, y: VY0, k: KMIN }, bowlFin: null, bb: null };
  if (!imgBowl) return base;
  const bb = bboxOpaco(imgBowl) ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
  const ar = imgBowl.naturalHeight / imgBowl.naturalWidth;
  const w = px(BOWL_LADO.w);
  const h = w * ar;
  // bowl visible del juego (centro y tamaño)
  const tw = (bb.x1 - bb.x0) * w;
  const th = (bb.y1 - bb.y0) * h;
  const tcx = px(BOWL_LADO.x) + ((bb.x0 + bb.x1) / 2 - 0.5) * w;
  const tcy = py(BOWL_LADO.y) + ((bb.y0 + bb.y1) / 2 - 0.5) * h;
  // bowl del video (tamaño en px del video)
  const sw = vb.x1 - vb.x0;
  const sh = vb.y1 - vb.y0;
  const scx = (vb.x0 + vb.x1) / 2;
  const scy = (vb.y0 + vb.y1) / 2;
  const k = entre(Math.sqrt((tw / sw) * (th / sh)), KMIN, VIDEO_K_MAX);
  const vt = {
    k,
    x: entre(tcx - scx * k, W - VIDEO_W * k, 0),
    y: entre(tcy - scy * k, H - VIDEO_H * k, 0),
  };
  // dónde cae el bowl del video con esa escala y posición -> tamaño/lugar de la imagen del juego
  const fw = (sw * k) / (bb.x1 - bb.x0);
  const fh = fw * ar;
  const bowlFin = {
    x: vt.x + scx * k - ((bb.x0 + bb.x1) / 2 - 0.5) * fw,
    y: vt.y + scy * k - ((bb.y0 + bb.y1) / 2 - 0.5) * fh,
    w: fw,
  };
  return { vt, bowlFin, bb };
}

// `receta` = pasos de la torta (ver RECETAS). `torta` = imágenes/video de la torta (tortas.js).
// Se leen una sola vez, al montar la escena.
function EscenaMezcla({ receta, torta, onPaso, onBowl, onBatidor, onMezclaFin, onVideoFin }) {
  const canvasRef = useRef(null);
  const onMezclaFinRef = useRef(onMezclaFin);
  onMezclaFinRef.current = onMezclaFin;
  const onPasoRef = useRef(onPaso);
  const onBowlRef = useRef(onBowl);
  const onBatidorRef = useRef(onBatidor);
  const onVideoFinRef = useRef(onVideoFin);
  onPasoRef.current = onPaso;
  onBowlRef.current = onBowl;
  onBatidorRef.current = onBatidor;
  onVideoFinRef.current = onVideoFin;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const imgs = {};
    let raf;
    let vivo = true;

    // Colores de la mezcla según la torta (vainilla por defecto)
    const trozos = torta?.trozos ?? TROZOS;
    const colorMasa = torta?.colorMasa ?? "#f3dfa8";
    // Boca del bowl: se recalcula al cargar las imágenes (ver bocaAuto)
    let bocaRel = { ...BOCA };

    // Video (fuera del DOM: solo se dibuja en el canvas)
    // Si la torta no tiene video (servir: "animacion"), se sirve con una animación en el canvas
    const servirAnim = torta?.servir === "animacion";
    const vid = document.createElement("video");
    if (!servirAnim) vid.src = torta?.video ?? VIDEO_SRC;
    vid.preload = "auto";
    vid.playsInline = true;
    vid.setAttribute("playsinline", "");
    vid.load();

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
      listoT0: 0, // momento en que el bowl llegó al costado
      vt: { x: VX0, y: VY0, k: KMIN }, // dónde y a qué escala se dibuja el video (ver calzarVideo)
      bowlFin: null, // tamaño/lugar final del bowl para coincidir con el del video
      bbBowl: null, // parte visible de la imagen del bowl (solo para DEBUG_VIDEO)
      bowl: { x: px(BOWL_MANTEL.x), y: py(BOWL_MANTEL.y), w: px(BOWL_MANTEL.w) }, // posición actual del bowl

      // --- video ---
      servido: null, // { t0 } cuando arranca la animación de servir la masa (sin video)
      bowlRot: 0, // inclinación del bowl al verter
      videoIniciado: false,
      videoError: false, // el video no cargó (se avisa recién cuando le toca arrancar)
      videoT0: 0, // cuándo se pidió arrancar el video (para el tiempo máximo de espera)
      video: null, // { t0 } cuando el video ya está reproduciéndose
      videoFin: false,
      cierre: null, // { t0, avisado } fundido final a la mesada con el molde lleno
    };

    // ---------- helpers de geometría ----------
    const rectDe = (im, cx, cy, wPx) =>
      im ? { x: cx, y: cy, w: wPx, h: (wPx * im.naturalHeight) / im.naturalWidth } : null;
    const dentro = (r, mx, my) =>
      r && Math.abs(mx - r.x) < r.w / 2 && Math.abs(my - r.y) < r.h / 2;

    // Imagen del bowl con TODOS los ingredientes (la última que exista en la receta).
    // Es la base del efecto de mezcla y de la que se calza el video.
    const bowlConIngredientes = () => {
      for (let i = receta.length - 1; i >= 0; i--) {
        if (receta[i].bowl && imgs[receta[i].bowl]) return imgs[receta[i].bowl];
      }
      return imgs.bowlMantel;
    };

    // Imagen del bowl según el paso actual (si falta alguna, usa la anterior)
    const bowlImg = () => {
      if (s.batido && imgs.bowlMasa) return imgs.bowlMasa;
      for (let i = s.paso - 1; i >= 0; i--) {
        if (receta[i].bowl && imgs[receta[i].bowl]) return imgs[receta[i].bowl];
      }
      return imgs.bowlMantel;
    };
    const rectBowl = () => rectDe(bowlImg(), s.bowl.x, s.bowl.y, s.bowl.w);
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
      const { scale = 1, dx = 0, dy = 0, rot = 0, alpha = 1, sombra = 4, h: hFijo } = o;
      const h = hFijo ?? (w * img.naturalHeight) / img.naturalWidth;
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
      x: b.x + b.w * bocaRel.x,
      y: b.y + b.h * bocaRel.y,
      rx: b.w * bocaRel.rx,
      ry: b.h * bocaRel.ry,
    });

    // Efecto de mezcla: remolino por anillos + masa lisa + trozos que se deshacen
    function mezclaBowl(fade = 1) {
      const b = rectBowl();
      if (!b || !s.bate) return;
      const boca = bocaDe(b);
      const { ang, prog } = s.bate;
      const k = boca.ry / boca.rx;
      const N = 10;
      const imgIng = bowlConIngredientes(); // bowl con todos los ingredientes
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

      // (2) masa lisa que aparece con el progreso.
      // Con imagen: se funde TODA la imagen del bowl con la masa (sin recortar por la elipse),
      // así no queda ningún aro de ingredientes entre la masa y el borde, y al terminar el
      // cambio al bowl final no se nota. Sin imagen: relleno liso dentro de la boca.
      ctx.save();
      ctx.globalAlpha = prog * fade;
      if (imgs.bowlMasa) {
        ctx.drawImage(imgs.bowlMasa, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      } else {
        ctx.beginPath();
        ctx.ellipse(boca.x, boca.y, boca.rx, boca.ry, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = colorMasa; // relleno liso del color de la torta
        ctx.fill();
      }
      ctx.restore();

      // (3) trozos que orbitan y se deshacen
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(boca.x, boca.y, boca.rx, boca.ry, 0, 0, Math.PI * 2);
      ctx.clip();
      for (const t of trozos) {
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

    // Pide que arranque el video: primero se funde quieto en su primer cuadro
    // y recién cuando ya es opaco se reproduce (ver dibujarVideo)
    function iniciarVideo() {
      if (s.videoIniciado) return;
      s.videoIniciado = true;
      s.videoT0 = performance.now();
      if (servirAnim || s.videoError) {
        s.servido = { t0: performance.now() }; // sin video: se sirve con la animación
        return;
      }
      vid.currentTime = 0;
    }
    const terminarVideo = () => {
      // El botón "Paso 2" solo puede aparecer cuando ya se mezcló y le tocaba arrancar al video.
      // (Antes, un error de carga del video —por ejemplo si falta el de chocolate— lo mostraba
      // apenas se abría la pantalla.)
      if (!vivo || !s.videoIniciado || s.videoFin) return;
      s.videoFin = true;
      // torta con molde final: primero se funde a la mesada y recién ahí se avisa (ver dibujarCierre)
      if (imgs.moldeFinal) {
        s.cierre = { t0: performance.now(), avisado: false };
        return;
      }
      onVideoFinRef.current?.(); // avisa a React: aparece el botón "Paso 2"
    };
    vid.addEventListener("ended", terminarVideo);
    vid.addEventListener("error", () => {
      console.warn("No se pudo cargar el video (se usa la animación de respaldo):", vid.currentSrc || vid.src);
      s.videoError = true;
      // si ya le tocaba arrancar y todavía no hay imagen, pasa a la animación de respaldo;
      // si todavía no le tocaba, lo retoma iniciarVideo
      if (s.videoIniciado && !s.video && !s.servido) s.servido = { t0: performance.now() };
    });

    // Dibuja el cuadro actual del video, cubriendo todo el canvas, con fundido de entrada
    function dibujarVideo(ahora) {
      if (!s.videoIniciado || servirAnim || s.servido) return;
      // si en 8 segundos no hay ni un cuadro, usa la animación de respaldo
      if (!s.video && ahora - s.videoT0 > 8000) {
        s.servido = { t0: ahora };
        return;
      }
      if (vid.readyState < 2) return;
      if (!s.video) s.video = { t0: ahora, playing: false }; // ya hay un cuadro: empieza el fundido
      const k = clamp((ahora - s.video.t0) / VIDEO_FADE_MS);
      // fundido completo: ahora sí se reproduce
      if (k >= 1 && !s.video.playing) {
        s.video.playing = true;
        vid.play().catch(() => {
          // algunos navegadores bloquean el audio: reintenta sin sonido
          vid.muted = true;
          vid.play().catch(terminarVideo);
        });
      }
      ctx.save();
      ctx.globalAlpha = ease(k);
      ctx.drawImage(vid, s.vt.x, s.vt.y, VIDEO_W * s.vt.k, VIDEO_H * s.vt.k);
      ctx.restore();
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
          if (s.paso >= receta.length) s.finalT = performance.now();
        }
        if (t >= 1) s.cuchara = null;
      } else if (c.modo === "bate") {
        // El batidor entra al bowl y da vueltas con una órbita elíptica.
        // El ángulo avanza con ease(): arranca lento, acelera y frena al final.
        const t = clamp((ahora - c.t0) / BATIDO_MS);
        const b = rectBowl();
        // la órbita se centra en la boca del bowl
        const cx = b ? b.x + b.w * bocaRel.x : px(BOWL_MANTEL.x);
        const cy = b ? b.y + b.h * (bocaRel.y + BATIDO_CFG.subeY) : py(BOWL_MANTEL.y);
        const rx = b ? b.w * bocaRel.rx * BATIDO_CFG.kRadioX : 40;
        const ry = b ? b.h * bocaRel.ry * BATIDO_CFG.kRadioY : 15;
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
          onMezclaFinRef.current?.(); // avisa a React: se esconde el cuadro de instrucciones
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

    // Chorro de masa que cae del borde del bowl inclinado al molde
    function dibujarChorro(sv) {
      const b = rectBowl();
      if (!b) return;
      const boca = bocaDe(b);
      const th = s.bowlRot;
      // borde derecho de la boca, girado igual que el bowl
      const ox = boca.x + boca.rx - b.x;
      const oy = boca.y - b.y;
      const lx = b.x + ox * Math.cos(th) - oy * Math.sin(th);
      const ly = b.y + ox * Math.sin(th) + oy * Math.cos(th);
      const mImg = imgs.moldeVacio || imgs.moldeRelleno;
      const mh = mImg ? (px(SERVIR_MOLDE.w) * mImg.naturalHeight) / mImg.naturalWidth : 0;
      const tx = px(SERVIR_MOLDE.x);
      const ty = py(SERVIR_MOLDE.y) - mh * 0.1;
      const cx = lx + (tx - lx) * 0.2;
      const cy = ly + (ty - ly) * 0.7;
      const pt = (t) => ({
        x: (1 - t) * (1 - t) * lx + 2 * (1 - t) * t * cx + t * t * tx,
        y: (1 - t) * (1 - t) * ly + 2 * (1 - t) * t * cy + t * t * ty,
      });
      const a = sv.chorroIni;
      const e = sv.chorroFin;
      if (e <= a) return;
      const N = 24;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const [color, ancho] of [[colorMasa, W * 0.011], ["rgba(255,255,255,0.22)", W * 0.0035]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = ancho;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const p = pt(a + ((e - a) * i) / N);
          if (i) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Fundido final: mesada vacía + molde con la masa, por encima del último cuadro del video
    function dibujarCierre(ahora) {
      const c = s.cierre;
      if (!c) return;
      const k = ease(clamp((ahora - c.t0 - CIERRE_PAUSA) / CIERRE_MS));
      if (k > 0) {
        if (imgs.fondo) {
          ctx.save();
          ctx.globalAlpha = k;
          ctx.drawImage(imgs.fondo, 0, 0, W, H);
          ctx.restore();
        }
        if (imgs.moldeFinal) {
          sprite(imgs.moldeFinal, px(MOLDE_FINAL.x), py(MOLDE_FINAL.y), px(MOLDE_FINAL.w), { alpha: k, sombra: 6 });
        }
      }
      if (k >= 1 && !c.avisado) {
        c.avisado = true;
        onVideoFinRef.current?.(); // avisa a React: aparece el botón "Paso 2"
      }
    }

    function dibujar(ahora) {
      if (!vivo) return;
      ctx.clearRect(0, 0, W, H);
      if (imgs.fondo) ctx.drawImage(imgs.fondo, 0, 0, W, H);

      // transición final: desaparecen los objetos de la mesa -> el bowl se desliza al costado
      let kFade = 0;
      if (s.fin) {
        const dt = ahora - s.fin.t0;
        kFade = ease(clamp(dt / FIN_FADE_MS));
        const m = ease(clamp((dt - FIN_FADE_MS - BOWL_MOVE_DELAY) / BOWL_MOVE_MS));
        s.bowl.x = lerp(px(BOWL_MANTEL.x), px(BOWL_LADO.x), m);
        s.bowl.y = lerp(py(BOWL_MANTEL.y), py(BOWL_LADO.y), m);
        s.bowl.w = lerp(px(BOWL_MANTEL.w), px(BOWL_LADO.w), m);
        if (m >= 1 && !s.listoT0) s.listoT0 = ahora;
      }

      // con el bowl al costado: arranca el video (se funde encima, quieto en su primer cuadro)
      if (s.listoT0 && !s.videoIniciado && ahora - s.listoT0 > VIDEO_DELAY) iniciarVideo();

      // mientras se funde el video, el bowl del juego se acomoda al tamaño/lugar del bowl del video
      if (s.listoT0 && s.bowlFin) {
        const a = ease(clamp((ahora - s.listoT0 - VIDEO_DELAY) / VIDEO_FADE_MS));
        s.bowl.x = lerp(px(BOWL_LADO.x), s.bowlFin.x, a);
        s.bowl.y = lerp(py(BOWL_LADO.y), s.bowlFin.y, a);
        s.bowl.w = lerp(px(BOWL_LADO.w), s.bowlFin.w, a);
      }

      // servir la masa sin video: el bowl va sobre el molde, se inclina y vuelve
      let sv = null;
      if (s.servido) {
        sv = servirEstado(ahora - s.servido.t0);
        s.bowl.x = lerp(px(BOWL_LADO.x), px(SERVIR_BOWL.x), sv.mueve);
        s.bowl.y = lerp(py(BOWL_LADO.y), py(SERVIR_BOWL.y), sv.mueve);
        s.bowl.w = lerp(px(BOWL_LADO.w), px(SERVIR_BOWL.w), sv.mueve);
        s.bowlRot = SERVIR_INCLINA * sv.mueve;
        if (sv.fin) terminarVideo(); // avisa a React: aparece el botón "Paso 2"
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

      // molde (solo cuando se sirve la masa sin video): va debajo del bowl
      if (sv) {
        const o = { alpha: sv.molde, dy: -40 * (1 - sv.molde), sombra: 6 };
        if (imgs.moldeVacio) sprite(imgs.moldeVacio, px(SERVIR_MOLDE.x), py(SERVIR_MOLDE.y), px(SERVIR_MOLDE.w), o);
        if (imgs.moldeRelleno) {
          sprite(imgs.moldeRelleno, px(SERVIR_MOLDE.x), py(SERVIR_MOLDE.y), px(SERVIR_MOLDE.w), {
            ...o,
            alpha: sv.molde * sv.lleno,
            sombra: 0,
          });
        }
      }

      // bowl sobre el mantel (cae al aparecer; luego, al costado)
      if (s.bowlEnMantel) {
        const im = bowlImg();
        const t = ease(clamp((ahora - s.bowlT0) / 500));
        const o = {
          alpha: t,
          dy: -60 * (1 - t),
          scale: 0.85 + 0.15 * t,
          sombra: 6,
          rot: s.bowlRot,
        };
        if (sv && imgs.bowlMantel) {
          // al verter: el bowl vacío queda debajo y el de la masa se va desvaneciendo
          sprite(imgs.bowlMantel, s.bowl.x, s.bowl.y, s.bowl.w, o);
          if (im && im !== imgs.bowlMantel) {
            sprite(im, s.bowl.x, s.bowl.y, s.bowl.w, { ...o, alpha: o.alpha * (1 - sv.lleno), sombra: 0 });
          }
        } else if (im) {
          sprite(im, s.bowl.x, s.bowl.y, s.bowl.w, o);
        }
      }

      // chorro de masa (encima del bowl y del molde)
      if (sv && sv.chorroFin > 0 && sv.chorroIni < 1) dibujarChorro(sv);

      // efecto de mezcla sobre el bowl (si hay bowlMasa.png, al terminar lo dibuja el propio bowl)
      if (s.bate && !(s.batido && imgs.bowlMasa) && !s.servido) mezclaBowl();

      if (DEBUG_VIDEO) {
        const k = s.vt.k;
        const vb = torta?.videoBowl ?? VIDEO_BOWL;
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "magenta"; // bowl del video
        ctx.strokeRect(
          s.vt.x + vb.x0 * k,
          s.vt.y + vb.y0 * k,
          (vb.x1 - vb.x0) * k,
          (vb.y1 - vb.y0) * k
        );
        const bb = s.bbBowl;
        const im = bowlImg();
        if (bb && im) {
          const w = s.bowl.w;
          const h = (w * im.naturalHeight) / im.naturalWidth;
          ctx.strokeStyle = "cyan"; // parte visible del bowl del juego
          ctx.strokeRect(
            s.bowl.x - w / 2 + bb.x0 * w,
            s.bowl.y - h / 2 + bb.y0 * h,
            (bb.x1 - bb.x0) * w,
            (bb.y1 - bb.y0) * h
          );
        }
        ctx.restore();
      }

      // receta completa: aparece el batidor en el lugar del recetario
      if (s.finalT && !s.batidorListo && !s.cuchara && ahora - s.finalT > BATIDOR_DELAY) {
        s.batidorListo = true;
        const home = homeDe(PASO_BATIDOR);
        s.cuchara = { x: home.x, y: home.y, modo: "aparece", t0: ahora, step: PASO_BATIDOR, aplicado: false };
        onBatidorRef.current?.();
      }

      dibujarCuchara(ahora);

      // el video va al final: se funde por encima de toda la escena y queda en su último cuadro
      dibujarVideo(ahora);

      // al terminar el video (si la torta tiene molde final): fundido a la mesada con el molde
      dibujarCierre(ahora);

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

      // 4) clic en el ingrediente que toca (según la receta de la torta): aparece lo que se arrastra
      const step = receta[s.paso];
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
      // carga las imágenes fijas + las de cada paso de la receta (+ la masa de esta torta)
      await Promise.all(
        Object.entries(srcDeReceta(receta, torta?.masa)).map(async ([k, v]) => {
          imgs[k] = await cargar(v);
        })
      );
      // molde final de la torta (opcional): si no existe, al terminar el video sigue como siempre
      if (torta?.moldeFinal) imgs.moldeFinal = await cargar(torta.moldeFinal);
      // si la masa de esta torta no existe, se usa un relleno liso del color de la torta
      // (colorMasa); ya no se cae a la masa de vainilla, que en chocolate se vería mal
      // la boca del bowl se centra en el borde real del bowl
      // (se mide sobre el bowl vacío, que es el que tiene el borde más limpio)
      bocaRel = torta?.boca ?? bocaAuto(imgs.bowlMantel ?? bowlConIngredientes()) ?? { ...BOCA };
      // el video se mueve y escala para que su bowl caiga sobre el bowl del juego
      const imgBowlFin = imgs.bowlMasa || bowlConIngredientes() || imgs.bowlMantel;
      const cal = calzarVideo(imgBowlFin, torta?.videoBowl ?? VIDEO_BOWL);
      s.vt = cal.vt;
      s.bowlFin = servirAnim ? null : cal.bowlFin; // con animación no hay bowl de video que calzar
      s.bbBowl = cal.bb;
      if (vivo) raf = requestAnimationFrame(dibujar);
    })();

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      vid.pause();
      vid.removeAttribute("src");
      vid.load();
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
// Los pasos vienen de la receta de la torta (prop `receta`).
function Recetario({ paso, receta, titulo = "Ingredientes" }) {
  const completa = paso >= receta.length;

  return (
    <aside className={styles.receta} aria-label={`Receta: ${titulo}`}>
      <h2 className={styles.recetaTitulo}>
        {titulo}
        <span className={styles.recetaCuenta}>
          {Math.min(paso, receta.length)}/{receta.length}
        </span>
      </h2>
      <ol className={styles.recetaLista}>
        {receta.map((r, i) => {
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
  const router = useRouter();
  const [mezclando, setMezclando] = useState(false);
  const [bowlListo, setBowlListo] = useState(false);
  const [batidorListo, setBatidorListo] = useState(false);
  const [paso, setPaso] = useState(0);
  const [videoFin, setVideoFin] = useState(false);
  const [mezclaTerminada, setMezclaTerminada] = useState(false);

  // Receta y datos de la torta de la partida. Arrancan con los de vainilla y, al entrar,
  // se cambian por los de la torta guardada en la partida (si no hay partida, queda vainilla).
  const [receta, setReceta] = useState(RECETA_VAINILLA);
  const [torta, setTorta] = useState(tortaDe(1));
  const [info, setInfo] = useState(infoDe(1));
  useEffect(() => {
    const id = leerPartida()?.idTorta;
    setReceta(recetaDe(id));
    setTorta(tortaDe(id));
    setInfo(infoDe(id));
  }, []);

  // Datos de la torta para el canvas: los de tortas.js + masa y colores de la mezcla de esta torta
  const tortaJuego = {
    ...torta,
    masa: info.masa ?? torta?.masa,
    colorMasa: info.colorMasa,
    trozos: info.trozos,
    boca: info.boca,
    servir: info.servir,
    moldeFinal: info.moldeFinal,
  };

  // Texto del cuadro de instrucciones según en qué etapa del juego estamos
  const textoInstrucciones = !bowlListo
    ? info.inicio
    : batidorListo
      ? TEXTO_BATIDOR
      : info.ingredientes;

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
            receta={receta}
            torta={tortaJuego}
            onPaso={setPaso}
            onBowl={() => setBowlListo(true)}
            onBatidor={() => setBatidorListo(true)}
            onMezclaFin={() => setMezclaTerminada(true)}
            onVideoFin={() => {registrarPuntos(1);setTimeout(() => { setVideoFin(true)}, BOTON_DELAY);}}
          />
          {bowlListo && !batidorListo && <Recetario paso={paso} receta={receta} titulo={info.nombre} />}

          {/* Cuadro de instrucciones (cambia según la torta y la etapa); se va cuando empieza el video */}
          {!videoFin && !mezclaTerminada && (
            <div className={styles.instrucciones} role="status">
              <h3 className={styles.instruccionesTitulo}>{info.nombre}</h3>
              <p className={styles.instruccionesTexto}>{textoInstrucciones}</p>
              <span className={styles.instruccionesDecoracion} aria-hidden="true">✦</span>
            </div>
          )}

          {/* Cuando termina el video: botón abajo a la derecha hacia el paso 2 */}
          {videoFin && mezclaTerminada && (
            <div className={styles.siguiente}>
              <Button type="button" onClick={() => router.push(RUTA_PASO_2)}>
                <span>Paso 2</span>
                <span aria-hidden="true">→</span>
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}