import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "../hooks/useSocket.js";
import { getClientId } from "../utils/clientId.js";

const RoomContext = createContext(null);
const SESSION_KEY = "ytjam_session";

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(roomCode, userName) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, userName }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function RoomProvider({ children }) {
  const socket = useSocket();
  const clientId = useRef(getClientId()).current;
  const [roomCode, setRoomCode] = useState(null);
  const [hostClientId, setHostClientId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("");
  const [hostOnlyControl, setHostOnlyControl] = useState(false);
  const [currentGenre, setCurrentGenre] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const userNameRef = useRef("");

  useEffect(() => {
    function applyRoomState(roomState) {
      setRoomCode(roomState.code);
      setHostClientId(roomState.hostClientId);
      setParticipants(roomState.participants);
      setQueue(roomState.queue);
      setCurrentIndex(roomState.currentIndex);
      setHostOnlyControl(roomState.hostOnlyControl);
      setCurrentGenre(roomState.currentGenre);
      setChatMessages(roomState.chatHistory || []);
    }

    function onCreated({ roomState }) {
      applyRoomState(roomState);
      saveSession(roomState.code, userNameRef.current);
    }
    function onJoined({ roomState }) {
      applyRoomState(roomState);
      saveSession(roomState.code, userNameRef.current);
    }
    function onRoomError({ message }) {
      setError(message);
      clearSession();
    }
    function onUserJoined({ participants: p }) {
      setParticipants(p);
    }
    function onUserLeft({ participants: p, newHostClientId }) {
      setParticipants(p);
      if (newHostClientId) setHostClientId(newHostClientId);
    }
    function onQueueUpdated({ queue: q, currentIndex: ci }) {
      setQueue(q);
      setCurrentIndex(ci);
    }
    function onControlModeChanged({ hostOnlyControl: mode }) {
      setHostOnlyControl(mode);
    }
    function onPlay({ genre }) {
      setCurrentGenre(genre || null);
    }
    function onChatMessage(message) {
      setChatMessages((prev) => [...prev, message].slice(-50));
    }
    function onConnect() {
      const session = loadSession();
      if (session?.roomCode && session?.userName) {
        userNameRef.current = session.userName;
        setUserName(session.userName);
        socket.emit("room:join", { roomCode: session.roomCode, userName: session.userName, clientId });
      }
    }

    socket.on("connect", onConnect);
    socket.on("room:created", onCreated);
    socket.on("room:joined", onJoined);
    socket.on("room:error", onRoomError);
    socket.on("room:userJoined", onUserJoined);
    socket.on("room:userLeft", onUserLeft);
    socket.on("queue:updated", onQueueUpdated);
    socket.on("room:controlModeChanged", onControlModeChanged);
    socket.on("playback:play", onPlay);
    socket.on("chat:message", onChatMessage);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("room:created", onCreated);
      socket.off("room:joined", onJoined);
      socket.off("room:error", onRoomError);
      socket.off("room:userJoined", onUserJoined);
      socket.off("room:userLeft", onUserLeft);
      socket.off("queue:updated", onQueueUpdated);
      socket.off("room:controlModeChanged", onControlModeChanged);
      socket.off("playback:play", onPlay);
      socket.off("chat:message", onChatMessage);
    };
  }, [socket, clientId]);

  const createRoom = useCallback(
    (name) => {
      userNameRef.current = name;
      setUserName(name);
      setError(null);
      socket.emit("room:create", { userName: name, clientId });
    },
    [socket, clientId]
  );

  const joinRoom = useCallback(
    (code, name) => {
      userNameRef.current = name;
      setUserName(name);
      setError(null);
      socket.emit("room:join", { roomCode: code, userName: name, clientId });
    },
    [socket, clientId]
  );

  const setControlMode = useCallback(
    (mode) => {
      socket.emit("room:setControlMode", { hostOnlyControl: mode });
    },
    [socket]
  );

  const sendChatMessage = useCallback(
    (text) => {
      socket.emit("chat:message", { text });
    },
    [socket]
  );

  const leaveRoom = useCallback(() => {
    clearSession();
    setRoomCode(null);
    setHostClientId(null);
    setParticipants([]);
    setQueue([]);
    setCurrentIndex(-1);
    setHostOnlyControl(false);
    setCurrentGenre(null);
    setChatMessages([]);
    socket.disconnect();
    socket.connect();
  }, [socket]);

  const isHost = clientId === hostClientId;

  const value = {
    socket,
    clientId,
    roomCode,
    hostClientId,
    isHost,
    participants,
    queue,
    currentIndex,
    error,
    userName,
    hostOnlyControl,
    setControlMode,
    currentGenre,
    chatMessages,
    sendChatMessage,
    createRoom,
    joinRoom,
    leaveRoom,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error("useRoom must be used within RoomProvider");
  return ctx;
}

export { RoomProvider, useRoom };
