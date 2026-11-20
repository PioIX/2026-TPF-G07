
import { BACKEND_URL } from "@/config/backend.js";
import { leerPartida } from "@/lib/partida";

export async function registrarPuntos(paso) {

    const partida = leerPartida();
    const idUsuario = localStorage.getItem("id");

    if (!partida || !partida.idPartida || !idUsuario) {
        console.log("No hay una partida o usuario identificado");
        return;
    }

    try {

        const respuesta = await fetch(`${BACKEND_URL}/puntos/paso`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                idPartida: partida.idPartida,
                idUsuario: Number(idUsuario),
                paso: paso
            })
        });

        const data = await respuesta.json();

        if (!respuesta.ok || !data.ok) {
            console.error("Error al guardar los puntos:", data.message);
            return;
        }

        console.log("Puntos guardados:", data);

    } catch (error) {

        console.error("Error al conectar con el backend:", error);

    }
}
