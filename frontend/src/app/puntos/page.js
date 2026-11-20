
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./puntos.module.css";
import Button from "@/components/Button";
import { BACKEND_URL } from "@/config/backend.js";
import { leerPartida } from "@/lib/partida";

export default function PuntosPage() {

    const router = useRouter();

    const [ranking, setRanking] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        async function obtenerRanking() {

            const partida = leerPartida();

            if (!partida || !partida.idPartida) {
                setError("No se encontró la competencia.");
                setCargando(false);
                return;
            }

            try {

                const respuesta = await fetch(
                    `${BACKEND_URL}/ranking/${partida.idPartida}`
                );

                const data = await respuesta.json();

                if (!respuesta.ok || !data.ok) {
                    throw new Error("No se pudo obtener el ranking");
                }

                setRanking(data.ranking);

            } catch (error) {

                console.error(error);
                setError("No se pudo cargar el ranking.");

            } finally {

                setCargando(false);

            }
        }

        obtenerRanking();

    }, []);

    return (

        <main className={styles.game}>

            <section className={styles.panel}>

                <h1>🏆 Ranking Petit Bakery</h1>

                <p>Resultados de la competencia</p>

                {cargando && (
                    <p>Cargando ranking...</p>
                )}

                {error && (
                    <p>{error}</p>
                )}

                {!cargando && !error && (

                    <table className={styles.tabla}>

                        <thead>
                            <tr>
                                <th>Posición</th>
                                <th>Participante</th>
                                <th>Puntos</th>
                            </tr>
                        </thead>

                        <tbody>

                            {ranking.map((jugador, index) => (

                                <tr key={index}>

                                    <td>
                                        {index + 1}°
                                    </td>

                                    <td>
                                        {jugador.nombre}
                                    </td>

                                    <td>
                                        {jugador.puntos}
                                    </td>

                                </tr>

                            ))}

                            {ranking.length === 0 && (
                                <tr>
                                    <td colSpan="3">
                                        Todavía no hay participantes.
                                    </td>
                                </tr>
                            )}

                        </tbody>

                    </table>

                )}

                <Button
                    type="button"
                    onClick={() => router.push("/")}
                >
                    Volver al inicio
                </Button>

            </section>

        </main>

    );

}
