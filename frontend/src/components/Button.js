"use client"
import styles from "./Button.module.css"

export default function Button({ text, onClick, type = "submit" }) {
    return (
        <button
            type={type}
            onClick={onClick}
            className={styles.boton}
        >
            {text}
        </button>
    );
}