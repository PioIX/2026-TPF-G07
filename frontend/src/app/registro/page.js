"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/Input";
import Button from "@/components/Button";
import styles from "../Auth.module.css";

export default function RegisterPage() {
  const router = useRouter();

export default function RegisterPage({
    
  nRegisterSuccess,
  onNavigateToLogin,
}) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    contraseña: "",
    foto: "",
  });

  const [mensajeError, setMensajeError] = useState("");
  const [cargando, setCargando] = useState(false);


  useEffect(() => {
    document.title = "WhatsApp Pio - Registrarse";
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

    if (!formData.nombre.trim()) {
      setMensajeError("Ingresá tu nombre.");
      return;
    }

    if (!formData.correo.trim()) {
      setMensajeError("Ingresá tu correo.");
      return;
    }

    if (!formData.contraseña.trim()) {
      setMensajeError("Ingresá una contraseña.");
      return;
    }

    setCargando(true);

    try {
      console.log("Enviando datos:", formData);

      const respuesta = await fetch("http://localhost:4000/register", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(formData),
      });

      console.log("Estado del servidor:", respuesta.status);

      const data = await respuesta.json();

      console.log("Respuesta del backend:", data);

      if (data.ok === true) {
        alert("¡Usuario registrado correctamente!");

        localStorage.setItem(
          "id_usuario",
          data.id_usuario
        );

        router.push("/");
      } else {
        setMensajeError(
          data.message || "No se pudo registrar el usuario."
        );
      }

    } catch (error) {
      console.error("Error en el fetch:", error);

      setMensajeError(
        "No se pudo conectar con el servidor."
      );

    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.tarjeta}>

        <h1>Registrarse</h1>

        {mensajeError && (
          <p className={styles.error}>
            {mensajeError}
          </p>
        )}

        <form onSubmit={handleSubmit}>

          <Input
            label="Nombre"
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Tu nombre"
          />

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

          <Input
            label="Foto"
            type="text"
            name="foto"
            value={formData.foto}
            onChange={handleChange}
            placeholder="URL de la foto (opcional)"
          />

          <Button
            text={cargando ? "Registrando..." : "Registrarse"}
            type="submit"
          />

        </form>

        <p className={styles.cambioVista}>
          ¿Ya tienes una cuenta?{" "}

          <span
            onClick={() => router.push("/")}
            className={styles.enlace}
          >
            Inicia sesión aquí
          </span>
        </p>

      </div>
    </div>
  );
}