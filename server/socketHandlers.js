import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  serializeRoom,
} from "./roomManager.js";

const socketToRoom = new Map();

function registerSocketHandlers(io, socket) {
  socket.on("room:create", ({ userName }) => {
    const room = createRoom(socket.id, userName || "Host");
    socket.join(room.code);
    socketToRoom.set(socket.id, room.code);
    socket.emit("room:created", { roomCode: room.code, roomState: serializeRoom(room) });
  });

  socket.on("room:join", ({ roomCode, userName }) => {
    const room = joinRoom(roomCode, socket.id, userName || "Guest");
    if (!room) {
      socket.emit("room:error", { message: "Room not found" });
      return;
    }
    socket.join(room.code);
    socketToRoom.set(socket.id, room.code);
    socket.emit("room:joined", { roomState: serializeRoom(room) });
    socket.to(room.code).emit("room:userJoined", {
      userName,
      participants: Array.from(room.participants.values()),
    });
  });

  socket.on("queue:add", ({ videoId, title, thumbnail, channel, duration }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    room.queue.push({ videoId, title, thumbnail, channel, duration, addedBy: socket.id });
    room.lastActivity = Date.now();
    if (room.currentIndex === -1) {
      room.currentIndex = 0;
      io.to(room.code).emit("playback:play", { videoId: room.queue[0].videoId, startAt: 0 });
      room.isPlaying = true;
    }
    io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
  });

  socket.on("queue:remove", ({ index }) => {
    const room = getRoomForSocket(socket);
    if (!room || index < 0 || index >= room.queue.length) return;
    room.queue.splice(index, 1);
    if (room.currentIndex >= room.queue.length) {
      room.currentIndex = room.queue.length - 1;
    }
    room.lastActivity = Date.now();
    io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
  });

  socket.on("queue:reorder", ({ from, to }) => {
    const room = getRoomForSocket(socket);
    if (!room) return;
    const { queue } = room;
    if (from < 0 || from >= queue.length || to < 0 || to >= queue.length) return;

    const wasCurrent = room.currentIndex === from;
    const [item] = queue.splice(from, 1);
    queue.splice(to, 0, item);

    if (wasCurrent) {
      room.currentIndex = to;
    } else if (from < room.currentIndex && to >= room.currentIndex) {
      room.currentIndex -= 1;
    } else if (from > room.currentIndex && to <= room.currentIndex) {
      room.currentIndex += 1;
    }

    room.lastActivity = Date.now();
    io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
  });

  socket.on("queue:playNow", ({ index }) => {
    const room = getRoomForSocket(socket);
    if (!room || index < 0 || index >= room.queue.length) return;
    room.currentIndex = index;
    room.isPlaying = true;
    room.lastActivity = Date.now();
    io.to(room.code).emit("playback:play", { videoId: room.queue[index].videoId, startAt: 0 });
    io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
  });

  socket.on("playback:sync", ({ videoId, currentTime, isPlaying }) => {
    const room = getRoomForSocket(socket);
    if (!room || room.hostId !== socket.id) return;
    room.isPlaying = isPlaying;
    room.lastActivity = Date.now();
    socket.to(room.code).emit("playback:state", {
      videoId,
      currentTime,
      isPlaying,
      ts: Date.now(),
    });
  });

  socket.on("playback:skip", () => {
    const room = getRoomForSocket(socket);
    if (!room || room.queue.length === 0) return;
    const nextIndex = room.currentIndex + 1;
    if (nextIndex >= room.queue.length) {
      room.currentIndex = room.queue.length - 1;
      room.isPlaying = false;
      io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
      return;
    }
    room.currentIndex = nextIndex;
    room.isPlaying = true;
    room.lastActivity = Date.now();
    io.to(room.code).emit("playback:play", { videoId: room.queue[nextIndex].videoId, startAt: 0 });
    io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
  });

  socket.on("disconnect", () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    socketToRoom.delete(socket.id);

    const result = leaveRoom(roomCode, socket.id);
    if (!result || result.deleted) return;

    io.to(roomCode).emit("room:userLeft", {
      participants: Array.from(result.room.participants.values()),
      newHostId: result.hostMigrated ? result.room.hostId : undefined,
    });
  });
}

function getRoomForSocket(socket) {
  const code = socketToRoom.get(socket.id);
  return code ? getRoom(code) : null;
}

export { registerSocketHandlers };
