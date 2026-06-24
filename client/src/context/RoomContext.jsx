import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSocket } from "../hooks/useSocket.js";

const RoomContext = createContext(null);

function RoomProvider({ children }) {
  const socket = useSocket();
  const [roomCode, setRoomCode] = useState(null);
  const [hostId, setHostId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    function applyRoomState(roomState) {
      setRoomCode(roomState.code);
      setHostId(roomState.hostId);
      setParticipants(roomState.participants);
      setQueue(roomState.queue);
      setCurrentIndex(roomState.currentIndex);
    }

    function onCreated({ roomState }) {
      applyRoomState(roomState);
    }
    function onJoined({ roomState }) {
      applyRoomState(roomState);
    }
    function onRoomError({ message }) {
      setError(message);
    }
    function onUserJoined({ participants: p }) {
      setParticipants(p);
    }
    function onUserLeft({ participants: p, newHostId }) {
      setParticipants(p);
      if (newHostId) setHostId(newHostId);
    }
    function onQueueUpdated({ queue: q, currentIndex: ci }) {
      setQueue(q);
      setCurrentIndex(ci);
    }

    socket.on("room:created", onCreated);
    socket.on("room:joined", onJoined);
    socket.on("room:error", onRoomError);
    socket.on("room:userJoined", onUserJoined);
    socket.on("room:userLeft", onUserLeft);
    socket.on("queue:updated", onQueueUpdated);

    return () => {
      socket.off("room:created", onCreated);
      socket.off("room:joined", onJoined);
      socket.off("room:error", onRoomError);
      socket.off("room:userJoined", onUserJoined);
      socket.off("room:userLeft", onUserLeft);
      socket.off("queue:updated", onQueueUpdated);
    };
  }, [socket]);

  const createRoom = useCallback(
    (name) => {
      setUserName(name);
      setError(null);
      socket.emit("room:create", { userName: name });
    },
    [socket]
  );

  const joinRoom = useCallback(
    (code, name) => {
      setUserName(name);
      setError(null);
      socket.emit("room:join", { roomCode: code, userName: name });
    },
    [socket]
  );

  const isHost = socket.id === hostId;

  const value = {
    socket,
    roomCode,
    hostId,
    isHost,
    participants,
    queue,
    currentIndex,
    error,
    userName,
    createRoom,
    joinRoom,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within RoomProvider");
  return ctx;
}

export { RoomProvider, useRoom };
