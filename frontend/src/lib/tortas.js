// Va en: src/lib/tortas.js
// Qué imágenes / video usa cada torta. La clave es Tortas.id_torta (1 = vainilla, 2 = chocolate).
// Para cambiar una imagen o video de una torta, solo hay que cambiar la ruta acá.
export const TORTAS = {
  1: {
    id: 1,
    nombre: "Vainilla",
    masa: "/objetos/bowlMasa.png", // bowl con la masa lista
    video: "/objetos/servirMezcla.mp4", // video de servir la masa
    videoBowl: { x0: 123, y0: 468, x1: 540, y1: 814 }, // dónde está el bowl en el 1er cuadro del video
    horneadoVideo: "/horneado.mp4", // video de abrir el horno
    moldeHornoVideo: "/molde-horno.mp4", // video de meter el molde en el horno
    moldeArrastrable: "/molde.png", // el molde que se arrastra hasta el horno
    fondoInicio: "/fondo-inicio.png", // fondo de la page del horno, antes de abrirlo
    fondoFinal: "/fondo-final.png", // fondo de la page del horno, al terminar el video (queda tapado por el video)
    fondoContador: "/Cocina.png", // fondo de la page de hornear (los 10 toques)
    pastelHorneado: "/objetosDecoracion/pastelHorneado.png", // el pastel que se decora
    pastelListo: "/pastel-horneado.png", // el que se muestra al terminar de hornear
  },
  2: {
    id: 2,
    nombre: "Chocolate",
    masa: "/objetos/bowlMasaChocolate.png",
    video: "/objetos/servirMezclaChocolate.mp4", // 1920x1080, ya procesado
    videoBowl: { x0: 127, y0: 471, x1: 538, y1: 816 }, // medido sobre el 1er cuadro del video
    horneadoVideo: "/horneado-chocolate.mp4", // 1280x720, tramo 0 - 5,4 s del video del horno
    moldeHornoVideo: "/molde-horno-chocolate.mp4", // 1280x720, tramo 5,4 - 10,2 s del video del horno
    moldeArrastrable: "/objetos/moldeChocoArrastrable.png",
    moldeInicio: { x: 0.175, y: 0.8, enVideo: true }, // sobre la mesada del video (fracciones del video 1280x720)
    fondoInicio: "/fondo-inicio.png", // <- cambiá estas tres rutas por las imágenes de chocolate
    fondoFinal: "/fondo-final.png",
    fondoContador: "/horneadoChoco.png",
    pastelHorneado: "/objetosDecoracion/pastelHorneadoChocolate.png",
    pastelListo: "/objetos/moldeCocidoChoco.png",
  },
};

// Si el id no existe (o no hay partida), usa la de vainilla: el juego nunca se rompe.
export const tortaDe = (id) => TORTAS[id] ?? TORTAS[1];