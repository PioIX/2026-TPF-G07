"use client";

import styles from "./Message.module.css";

export default function Message({ texto, propio, remitente,}) {
  return (
    <div
      className={
        propio
          ? styles.mensajePropio
          : styles.mensajeRecibido
      }
    >
      {!propio && (
        <strong>{remitente}</strong>
      )}

      <p>{texto}</p>
    </div>
  );
}