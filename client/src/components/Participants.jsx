import React from "react";
import { useRoom } from "../context/RoomContext.jsx";

function Participants() {
  const { participants, hostClientId } = useRoom();

  return (
    <div className="rounded-xl bg-neutral-900 p-4">
      <h2 className="mb-2 text-sm font-semibold text-neutral-300">
        Listening now ({participants.length})
      </h2>
      <ul className="space-y-1">
        {participants.map((p) => (
          <li key={p.clientId} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {p.name}
            {p.clientId === hostClientId && <span className="text-xs text-neutral-500">(host)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Participants;
