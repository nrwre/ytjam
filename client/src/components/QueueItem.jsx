import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRoom } from "../context/RoomContext.jsx";

function QueueItem({ track, index, isCurrent }) {
  const { socket } = useRoom();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.videoId + index,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg p-2 ${isCurrent ? "bg-red-600/20 ring-1 ring-red-600/50" : "hover:bg-neutral-800"}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab px-1 text-neutral-500">
        ⋮⋮
      </button>
      <img src={track.thumbnail} alt="" className="h-10 w-16 rounded object-cover" />
      <button
        className="flex-1 overflow-hidden text-left"
        onDoubleClick={() => socket.emit("queue:playNow", { index })}
        title="Double-click to play"
      >
        <p className="truncate text-sm font-medium">{track.title}</p>
        <p className="truncate text-xs text-neutral-400">{track.channel}</p>
      </button>
      <span className="text-xs text-neutral-500">{track.duration}</span>
      <button
        onClick={() => socket.emit("queue:remove", { index })}
        className="px-2 text-neutral-500 hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
}

export default QueueItem;
