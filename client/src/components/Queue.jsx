import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useRoom } from "../context/RoomContext.jsx";
import QueueItem from "./QueueItem.jsx";

function Queue() {
  const { socket, queue, currentIndex } = useRoom();

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = queue.findIndex((t, i) => t.videoId + i === active.id);
    const to = queue.findIndex((t, i) => t.videoId + i === over.id);
    if (from === -1 || to === -1) return;
    socket.emit("queue:reorder", { from, to });
  }

  if (queue.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral-500">Queue is empty. Add a song to get started.</p>;
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={queue.map((t, i) => t.videoId + i)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {queue.map((track, index) => (
            <QueueItem key={track.videoId + index} track={track} index={index} isCurrent={index === currentIndex} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default Queue;
