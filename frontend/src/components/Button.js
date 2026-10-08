"use client";
import styles from "./Button.module.css";

export default function Button({ onClick, type = "submit", children }) {
  return (
    <button type={type} onClick={onClick} className={styles.boton}>
      {children}
    </button>
  );
}
