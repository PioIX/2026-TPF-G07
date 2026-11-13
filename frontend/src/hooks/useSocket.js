"use client";
// Va en: src/hooks/useSocket.js
import { useState, useEffect } from "react";
import io from "socket.io-client";

let socketCompartido = null;

// Dirección del backend. Antes estaba fija en localhost:4000, y "localhost" desde otra compu
// es ESA compu, no la tuya. Ahora:
//  1) si definís NEXT_PUBLIC_SOCKET_URL (por ejemplo http://192.168.0.10:4000), usa esa;
//  2) si no, usa la misma IP desde la que abriste el juego, en el puerto 4000.
function urlPorDefecto() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:4000`;
  return "http://localhost:4000";
}

// La conexión única de toda la app. También la usan las tortas (finCompetencia/PastelesFinales.js),
// así el jugador tiene el mismo socket.id que en la sala.
export function obtenerSocket(serverUrl = urlPorDefecto(), options = {}) {
  if (!socketCompartido) {
    socketCompartido = io(serverUrl, { ...options, withCredentials: false });
  }
  return socketCompartido;
}

const useSocket = (options = { withCredentials: false }, serverUrl = urlPorDefecto()) => {
  const [socket, setSocket] = useState(socketCompartido);
  const [isConnected, setIsConnected] = useState(socketCompartido?.connected || false);

  useEffect(() => {
    const socketIo = obtenerSocket(serverUrl, options);

    function conectar() {
      setIsConnected(true);
      console.log("Socket conectado:", socketIo.id);
    }

    function desconectar() {
      setIsConnected(false);
      console.log("Socket desconectado");
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