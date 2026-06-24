import React from "react";
import { useRoom } from "../context/RoomContext.jsx";

function Controls() {
  const { socket, isHost, queue, currentIndex } = useRoom();
  const hasNext = currentIndex < queue.length - 1;

  return (
    <div className="flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-3">
      <span className="text-sm text-neutral-400">
        {isHost ? "You are the host" : "Host controls playback"}
      </span>
      <button
        onClick={() => socket.emit("playback:skip")}
        disabled={!hasNext}
        className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-neutral-700"
      >
        Skip ▶
      </button>
    </div>
  );
}

export default Controls;
