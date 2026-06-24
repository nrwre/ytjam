import React, { useState } from "react";
import { useRoom } from "../context/RoomContext.jsx";
import Player from "./Player.jsx";
import Queue from "./Queue.jsx";
import SearchBar from "./SearchBar.jsx";
import Controls from "./Controls.jsx";
import Participants from "./Participants.jsx";
import GenreSprite from "./GenreSprite.jsx";

function Room() {
  const { roomCode, leaveRoom } = useRoom();
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">YT Jam</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-mono tracking-widest hover:bg-neutral-700"
          >
            {copied ? "Copied!" : roomCode}
          </button>
          <button
            onClick={leaveRoom}
            className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
          >
            Leave
          </button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <Player />
          <GenreSprite />
          <Controls />
        </div>
        <div className="space-y-4">
          <Participants />
          <div className="rounded-xl bg-neutral-900 p-4">
            <SearchBar />
            <div className="mt-4">
              <Queue />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Room;
