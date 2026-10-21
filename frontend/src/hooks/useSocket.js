"use client";

import { useState, useEffect } from "react";
import io from "socket.io-client";

let socketCompartido = null;

const useSocket = (
  options = { withCredentials: true },
  serverUrl = "http://localhost:4000"
) => {
  const [socket, setSocket] = useState(socketCompartido);
  const [isConnected, setIsConnected] = useState(
    socketCompartido?.connected || false
  );

  useEffect(() => {
    if (!socketCompartido) {
      socketCompartido = io(serverUrl, {
        ...options,
        withCredentials: true,
      });
    }

    const socketIo = socketCompartido;

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
