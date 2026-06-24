import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let sharedSocket = null;

function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(SERVER_URL, { autoConnect: true });
  }
  return sharedSocket;
}

function useSocket() {
  const socketRef = useRef(getSocket());
  useEffect(() => () => {}, []);
  return socketRef.current;
}

export { useSocket };
