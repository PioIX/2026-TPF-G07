"use client"
import styles from "./Input.module.css"

export default function Input({ label, type = "text", value, onChange, placeholder, name }) {
    return (
        <div className={styles.campo}>
            {label && <label className={styles.label}>{label}</label>}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={styles.input}
            />
        </div>
    );
}