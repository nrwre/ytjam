import React, { useState } from "react";
import { useRoom } from "../context/RoomContext.jsx";

function Lobby() {
  const { createRoom, joinRoom, error } = useRoom();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("create");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === "create") {
      createRoom(name.trim());
    } else {
      if (!code.trim()) return;
      joinRoom(code.trim(), name.trim());
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-neutral-900 p-8 shadow-xl">
        <h1 className="mb-1 text-3xl font-bold tracking-tight">YT Jam</h1>
        <p className="mb-6 text-sm text-neutral-400">Listen to YouTube together, in sync.</p>

        <div className="mb-4 flex rounded-lg bg-neutral-800 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 rounded-md py-1.5 transition ${mode === "create" ? "bg-red-600 text-white" : "text-neutral-300"}`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 rounded-md py-1.5 transition ${mode === "join" ? "bg-red-600 text-white" : "text-neutral-300"}`}
          >
            Join
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
          />
          {mode === "join" && (
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              maxLength={6}
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm uppercase tracking-widest outline-none focus:ring-2 focus:ring-red-600"
            />
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold transition hover:bg-red-500"
          >
            {mode === "create" ? "Create Room" : "Join Room"}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

export default Lobby;
