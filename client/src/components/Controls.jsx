import React from "react";
import { useRoom } from "../context/RoomContext.jsx";

function Controls() {
  const { socket, isHost, hostOnlyControl, setControlMode, queue, currentIndex } = useRoom();
  const hasNext = currentIndex < queue.length - 1;

  return (
    <div className="flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-400">
          {hostOnlyControl ? "Only the host controls playback" : "Everyone controls playback"}
        </span>
        {isHost && (
          <button
            onClick={() => setControlMode(!hostOnlyControl)}
            className="rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-300 transition hover:bg-neutral-700"
          >
            {hostOnlyControl ? "Allow everyone" : "Take control"}
          </button>
        )}
      </div>
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
