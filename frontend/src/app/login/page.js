"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    correo: "",
    contraseña: "",
  });
  const [mensajeError, setMensajeError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    document.title = "Petit Bakery - Iniciar Sesión";
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
      const respuesta = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await respuesta.json();
      console.log("Respuesta del backend:", data);

      if (data.message === "Inicio de sesion hecho") {
        localStorage.setItem("id_usuario", data.id_usuario);
        router.push("/chats"); // cambiá la ruta a la pantalla que sigue en tu app
      } else {
        setMensajeError(data.message || "Correo o contraseña incorrectos.");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
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
            <h1 className={styles.titulo}>Iniciar sesión</h1>

            <input
              className={styles.input}
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              placeholder="Correo electrónico"
              aria-label="Correo electrónico"
              autoComplete="email"
              required
            />

            <input
              className={styles.input}
              type="password"
              name="contraseña"
              value={formData.contraseña}
              onChange={handleChange}
              placeholder="Contraseña"
              aria-label="Contraseña"
              autoComplete="current-password"
              required
            />

            {mensajeError && <p className={styles.error}>{mensajeError}</p>}

            <button type="submit" className={styles.boton} disabled={enviando}>
              <span className={styles.corazon} aria-hidden="true">♥</span>
              {enviando ? "Entrando..." : "Entrar"}
              <span className={styles.corazon} aria-hidden="true">♥</span>
            </button>

            <p className={styles.cambioVista}>
              ¿No tenés cuenta?{" "}
              <button
                type="button"
                className={styles.enlace}
                onClick={() => router.push("/registro")}
              >
                Registrate acá
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}