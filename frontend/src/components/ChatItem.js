"use client";

import styles from "./ChatItem.module.css";

export default function ChatItem({chat,onClick,}) {
  const esGrupo = chat.nom_grupo !== null;

  const nombre = esGrupo
    ? chat.nom_grupo
    : chat.nombre_contacto || "Usuario";

  const foto =
    chat.foto_contacto ||
    chat.foto_grupo ||
    "/usuario-default.png";

  return (
    <div
      className={styles.chat}
      onClick={() => onClick(chat.id_chat || chat.id)}
    >
      <img
        src={foto}
        alt="Foto"
        className={styles.foto}
      />

      <div>
        <h3>{nombre}</h3>

        <p>
          {esGrupo ? "Grupo" : "Chat individual"}
        </p>
      </div>
    </div>
  );
}