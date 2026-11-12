"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ContadorHorno.module.css";
import Button from "@/components/Button";
import Buttonstyle from "@/components/Button.module.css";

const META = 10;
const RUTA_PASO_3 = "/competencia3";

export default function ContadorHornoPage() {
  const router = useRouter();
  const [toques, setToques] = useState(0);
  const [brillos, setBrillos] = useState([]);
  const horneado = toques >= META;

  const tocar = () => {
    if (horneado) return;
    const nuevo = toques + 1;
    setToques(nuevo);

    if (nuevo >= META) {
      // los brillitos se generan una sola vez, al terminar
      setBrillos(
        Array.from({ length: 36 }, (_, i) => ({
          id: i,
          left: 50 + (Math.random() - 0.5) * 60, // % horizontal alrededor del centro
          top: 40 + (Math.random() - 0.5) * 50,  // % vertical
          size: 14 + Math.random() * 26,         // px
          delay: Math.random() * 1.2,            // s
          duracion: 1 + Math.random() * 1.2,     // s
        }))
      );
    }
  };

  return (
    <main className={styles.game}>
          <Instrucciones
  toques={toques}
  horneado={horneado}
/>
      
      {horneado && (<>

          <div className={styles.resultado}>
            <img
              src="/pastel-horneado.png"
              alt="Pastel horneado"
              className={styles.pastel}
            />
            <p className={styles.mensaje}>¡Pastel horneado!</p>
          </div>

          {brillos.map((b) => (
            <span
              key={b.id}
              className={styles.brillo}
              style={{
                left: `${b.left}%`,
                top: `${b.top}%`,
                fontSize: `${b.size}px`,
                animationDelay: `${b.delay}s`,
                animationDuration: `${b.duracion}s`,
              }}
            >
              ✦
            </span>
          ))}

          {/* Botón abajo a la derecha hacia el paso 3 */}
          <div className={styles.siguiente}>
            <Button type="button" onClick={() => router.push(RUTA_PASO_3)}>
              <span>Paso 3</span>
              <span aria-hidden="true">→</span>
            </Button>
          </div>
        </>
      )}

      {!horneado && (
        <div className={styles.panel}>
          <Button className={Buttonstyle.boton} onClick={tocar}>
            Hornear
          </Button>
          <div className={styles.barra}>
            <div
              className={styles.relleno}
              style={{ width: `${(toques / META) * 100}%` }}
            />
          </div>
          <p className={styles.contador}>
            {toques} / {META}
          </p>
        </div>
      )}
    </main>
  );
}

function Instrucciones({ toques, horneado }) {
  let titulo = "¡Paso 2: Hornear la mezcla!";
  let mensaje = "Presioná el botón Hornear para comenzar a preparar tu pastel.";

  if (toques > 0 && !horneado) {
    titulo = "¡Seguí horneando!";
    mensaje = "Continuá presionando el botón Hornear hasta completar la barra de progreso.";
  }

  if (horneado) {
    titulo = "¡Pastel horneado!";
    mensaje = "¡Muy bien! Tu pastel está listo. Hacé clic en Paso 3 para continuar.";
  }

  return (
    <aside className={styles.instrucciones}>
      <h3 className={styles.instruccionesTitulo}>
         {titulo} 
      </h3>

      <p className={styles.instruccionesTexto}>
        {mensaje}
      </p>

      <span className={styles.instruccionesDecoracion}>

      </span>
    </aside>
  );
}