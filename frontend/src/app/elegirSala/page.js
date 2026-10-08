"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Buttonstyles from "@/components/Button.module.css";
import styles from "./lobby.module.css";

export default function LobbyPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Petit Bakery - Salas";
  }, []);

  return (
    <main className={styles.game}>
      {/* Misma caja que ocupa la imagen con "cover": los botones siempre quedan sobre el mostrador */}
      <div className={styles.escena}>
        <div className={styles.botones}>
          <div className={styles.item}>
            <Button
              type="button"
              onClick={() => router.push("/crear-sala")} // cambiá la ruta a la de tu pantalla
            >
              <span className={Buttonstyles.corazon} aria-hidden="true">♥</span>
              Crear sala
              <span className={Buttonstyles.corazon} aria-hidden="true">♥</span>
            </Button>
          </div>

          <div className={styles.item}>
            <Button
              type="button"
              onClick={() => router.push("/unirse-sala")} // cambiá la ruta a la de tu pantalla
            >
              <span className={Buttonstyles.corazon} aria-hidden="true">♥</span>
              Unirse a sala
              <span className={Buttonstyles.corazon} aria-hidden="true">♥</span>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}