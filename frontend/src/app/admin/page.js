"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import Button from "@/components/Button";
import Buttonstyle from "@/components/Button.module.css";
import Input from "@/components/Input";
import Inputstyles from "@/components/Input.module.css";

export default function InicioPage() {
  const router = useRouter();

  // Estado para abrir/cerrar el modal
  const [showModal, setShowModal] = useState(false);
  // Estado para la vista dentro del modal: 'main', 'usuarios', o 'agregar_usuario'
  const [modalView, setModalView] = useState("main");

  // Estado para los inputs del nuevo usuario
  const [formData, setFormData] = useState({
    nombre: "",
    mail: "",
    contraseña: "",
    es_admin: false,
  });

  // Estado para feedback al usuario (éxito o error)
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    document.title = "Petit Bakery";
  }, []);

  const handleOpenAdmin = () => {
    setModalView("main");
    setMensaje("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setMensaje("");
    // Limpiar formulario al cerrar
    setFormData({ nombre: "", mail: "", contraseña: "", es_admin: false });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmitAgregar = async (e) => {
    e.preventDefault();
    setMensaje("");

    try {
      const res = await fetch("http://localhost:4000/admin/agregar-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.ok) {
        setMensaje("¡Usuario agregado correctamente!");
        setFormData({
          nombre: "",
          mail: "",
          contraseña: "",
          es_admin: false,
        });
      } else {
        setMensaje(data.message || "Error al agregar usuario");
      }
    } catch (error) {
      console.error("Error al agregar usuario:", error);
      setMensaje("Error al conectar con el servidor. Revisá la consola.");
    }
  };

  return (
    <main className={styles.game}>
      <div className={styles.botones}>
        <Button
          type="button"
          className={Buttonstyle.button}
          onClick={handleOpenAdmin}
        >
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
            {/* VISTA 1: MAIN */}
            {modalView === "main" && (
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
                  onClick={() => {
                    setMensaje("");
                    setModalView("usuarios");
                  }}
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
            )}

            {/* VISTA 2: GESTIÓN DE USUARIOS */}
            {modalView === "usuarios" && (
              <div className={styles.modalContent}>
                <h2>Gestión de Usuarios</h2>
                <Button
                  type="button"
                  className={Buttonstyle.button}
                  onClick={() => {
                    setMensaje("");
                    setModalView("agregar_usuario");
                  }}
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

            {/* VISTA 3: FORMULARIO AGREGAR USUARIO */}
            {modalView === "agregar_usuario" && (
              <div className={styles.modalContent}>
                <h2>Agregar Usuario</h2>

                <form
                  onSubmit={handleSubmitAgregar}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <Input
                    className={Inputstyles.input}
                    type="text"
                    name="nombre"
                    placeholder="Nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                  />

                  <Input
                    className={Inputstyles.input}
                    type="email"
                    name="mail"
                    placeholder="Correo Electrónico"
                    value={formData.mail}
                    onChange={handleInputChange}
                    required
                  />

                  <Input
                    className={Inputstyles.input}
                    type="password"
                    name="contraseña"
                    placeholder="Contraseña"
                    value={formData.contraseña}
                    onChange={handleInputChange}
                    required
                  />

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <Input
                      className={Inputstyles.input}
                      type="checkbox"
                      name="es_admin"
                      checked={formData.es_admin}
                      onChange={handleInputChange}
                    />
                    ¿Es Administrador?
                  </label>

                  {mensaje && <p>{mensaje}</p>}

                  <Button type="submit" className={Buttonstyle.button}>
                    Agregar
                  </Button>
                  <Button
                    type="button"
                    className={Buttonstyle.button}
                    onClick={() => {
                      setMensaje("");
                      setModalView("usuarios");
                    }}
                  >
                    Volver
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
