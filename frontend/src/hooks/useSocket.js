
"use client";

import { useState, useEffect } from "react";
import { io } from "socket.io-client";

let socketCompartido = null;

function urlPorDefecto() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
}

export function obtenerSocket(serverUrl = urlPorDefecto()) {
  if (!socketCompartido) {
    socketCompartido = io(serverUrl, {
      withCredentials: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketCompartido.on("connect", () => {
      console.log("Socket conectado:", socketCompartido.id);
    });

    socketCompartido.on("connect_error", (error) => {
      console.error("Error de conexión Socket.IO:", error.message);
    });

    socketCompartido.on("disconnect", (reason) => {
      console.log("Socket desconectado:", reason);
    });
  }

  return socketCompartido;
}

const useSocket = (options = {}, serverUrl = urlPorDefecto()) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketIo = obtenerSocket(serverUrl);

    function conectar() {
      setIsConnected(true);
    }

    function desconectar() {
      setIsConnected(false);
    }

    socketIo.on("connect", conectar);
    socketIo.on("disconnect", desconectar);

    setSocket(socketIo);
    setIsConnected(socketIo.connected);

    return () => {
      socketIo.off("connect", conectar);
      socketIo.off("disconnect", desconectar);
    };
  }, [serverUrl]);

  return { socket, isConnected };
};

export { useSocket };
