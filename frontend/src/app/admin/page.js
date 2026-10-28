"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import Button from "@/components/Button";
import Buttonstyle from "@/components/Button.module.css";

export default function InicioPage() {
  const router = useRouter();
  
  // Estado para abrir/cerrar el modal
  const [showModal, setShowModal] = useState(false);
  // Estado para la vista dentro del modal: 'main' o 'usuarios'
  const [modalView, setModalView] = useState("main");

  useEffect(() => {
    document.title = "Petit Bakery";
  }, []);

  const handleOpenAdmin = () => {
    setModalView("main");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <main className={styles.game}>
      <div className={styles.botones}>
        <Button type="button" className={Buttonstyle.button} onClick={handleOpenAdmin}>
          Funciones Admin
        </Button>
        <Button
          type="button"
          className={Buttonstyle.button}
          onClick={() => router.push("/elegirSala")}
        >
          JUGAR
        </Button>
      </div>

      {/* Pop-up / Modal */}
      {showModal && (
        <div className={styles.overlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {modalView === "main" ? (
              <div className={styles.modalContent}>
                <h2>Funciones Admin</h2>
                <Button 
                  type="button" 
                  className={Buttonstyle.button}
                  onClick={() => console.log("Fijarse puntos")}
                >
                  Fijarse puntos
                </Button>
                <Button 
                  type="button" 
                  className={Buttonstyle.button}
                  onClick={() => setModalView("usuarios")}
                >
                  Ver Usuario
                </Button>
                <Button 
                  type="button" 
                  className={Buttonstyle.button} 
                  onClick={handleCloseModal}
                >
                  Cerrar
                </Button>
              </div>
            ) : (
              <div className={styles.modalContent}>
                <h2>Gestión de Usuarios</h2>
                <Button 
                  type="button" 
                  className={Buttonstyle.button}
                  onClick={() => console.log("Agregar usuario")}
                >
                  Agregar usuario
                </Button>
                <Button 
                  type="button" 
                  className={Buttonstyle.button}
                  onClick={() => console.log("Eliminar usuario")}
                >
                  Eliminar usuario
                </Button>
                <Button 
                  type="button" 
                  className={Buttonstyle.button}
                  onClick={() => setModalView("main")}
                >
                  Volver
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}