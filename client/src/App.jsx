import React from "react";
import { RoomProvider, useRoom } from "./context/RoomContext.jsx";
import Lobby from "./components/Lobby.jsx";
import Room from "./components/Room.jsx";

function AppContent() {
  const { roomCode } = useRoom();
  return roomCode ? <Room /> : <Lobby />;
}

function App() {
  return (
    <RoomProvider>
      <AppContent />
    </RoomProvider>
  );
}

export default App;
