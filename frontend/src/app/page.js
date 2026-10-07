"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import styles from "./inicial.module.css";

export default function LoginPage({ onLoginSuccess }) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    correo: "",
    contraseña: "",
  });

  const [mensajeError, setMensajeError] = useState("");

  useEffect(() => {
    document.title = "WhatsApp Pio - Iniciar Sesión";
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
        alert("¡Inicio de sesión exitoso!");

        localStorage.setItem("id_usuario", data.id_usuario);

        router.push("/chats");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      setMensajeError(
        "No se pudo conectar con el servidor backend."
      );
    }
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.tarjeta}>
        <h1>Iniciar Sesión</h1>
        <div className={styles.login}></div>

    {mensajeError && (
      <p className={styles.error}>
        {mensajeError}
      </p>
    )}

</div>
        <form onSubmit={handleSubmit}>
          <Input
            label="Correo electrónico"
            type="email"
            name="correo"
            value={formData.correo}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
          />

          <Input
            label="Contraseña"
            type="password"
            name="contraseña"
            value={formData.contraseña}
            onChange={handleChange}
            placeholder="********"
          />

          <Button
            text="Entrar"
            type="submit"
          />
        </form>

        <p className={styles.cambioVista}>
          ¿No tienes cuenta?{" "}
          <span
            onClick={() => router.push("/registro")}
            className={styles.enlace}
          >
            Regístrate aquí
          </span>
        </p>
      </div>
    </div>
  );
}