"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./registro.module.css";
import Inputstyles from "@/components/Input.module.css";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Buttonstyle from "@/components/Button.module.css";

export default function RegistroPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nombre: "",
    mail: "",
    contraseña: "",
  });
  const [mensajeError, setMensajeError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    document.title = "Petit Bakery - Registro";
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError("");
    setEnviando(true);

    try {
      // Ajustá la URL y los nombres de los campos a los de tu backend
      const respuesta = await fetch("http://localhost:4000/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await respuesta.json();
      console.log("Respuesta del backend:", data);

      if (respuesta.ok) {
        router.push("/login");
      } else {
        setMensajeError(data.message || "No se pudo crear la cuenta.");
      }
    } catch (error) {
      console.error("Error al registrarse:", error);
      setMensajeError("No se pudo conectar con el servidor backend.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className={styles.game}>
      {/* Misma caja que ocupa la imagen con "cover": el formulario siempre cae en el espacio blanco */}
      <div className={styles.escena}>
        <div className={styles.panel}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <h1 className={styles.titulo}>Crear cuenta</h1>

            <Input
              className={Inputstyles.input}
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre"
              aria-label="Nombre"
              autoComplete="name"
              required
            />

            <Input
              className={Inputstyles.input}
              type="email"
              name="mail"
              value={formData.mail}
              onChange={handleChange}
              placeholder="Correo electrónico"
              aria-label="Correo electrónico"
              autoComplete="email"
              required
            />

            <input
              className={Inputstyles.input}
              type="password"
              name="contraseña"
              value={formData.contraseña}
              onChange={handleChange}
              placeholder="Contraseña"
              aria-label="Contraseña"
              autoComplete="new-password"
              required
            />

            {mensajeError && <p className={styles.error}>{mensajeError}</p>}

            <Button type="submit" className={Buttonstyle.boton} disabled={enviando}>
              <span className={styles.corazon} aria-hidden="true">♥</span>
              {enviando ? "Creando..." : "Registrarse"}
              <span className={styles.corazon} aria-hidden="true">♥</span>
            </Button>

            <p className={styles.cambioVista}>
              ¿Ya tenés cuenta?{" "}
              <button
                type="button"
                className={styles.enlace}
                onClick={() => router.push("/login")}
              >
                Iniciá sesión
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}