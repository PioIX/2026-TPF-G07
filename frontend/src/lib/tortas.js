// Va en: src/lib/tortas.js
// Qué imágenes / video usa cada torta. La clave es Tortas.id_torta (1 = vainilla, 2 = chocolate).
// Para cambiar una imagen de una torta, solo hay que cambiar la ruta acá.
export const TORTAS = {
  1: {
    id: 1,
    nombre: "Vainilla",
    masa: "/objetos/bowlMasa.png", // bowl con la masa lista
    video: "/objetos/servirMezcla.mp4", // video de servir la masa
    videoBowl: { x0: 123, y0: 468, x1: 540, y1: 814 }, // dónde está el bowl en el 1er cuadro del video
    pastelHorneado: "/objetosDecoracion/pastelHorneado.png", // el pastel que se decora
    pastelListo: "/pastel-horneado.png", // el que se muestra al terminar de hornear
  },
  2: {
    id: 2,
    nombre: "Chocolate",
    masa: "/objetos/bowlMasaChocolate.png",
    video: "/objetos/servirMezclaChocolate.mp4", // 1920x1080, ya procesado
    videoBowl: { x0: 127, y0: 471, x1: 538, y1: 816 }, // medido sobre el 1er cuadro del video
    pastelHorneado: "/objetosDecoracion/pastelHorneadoChocolate.png",
    pastelListo: "/pastel-horneado-chocolate.png",
  },
};

// Si el id no existe (o no hay partida), usa la de vainilla: el juego nunca se rompe.
export const tortaDe = (id) => TORTAS[id] ?? TORTAS[1];