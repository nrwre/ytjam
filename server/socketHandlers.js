import {
  createRoom,
  getRoom,
  joinRoom,
  scheduleRemoval,
  serializeRoom,
} from "./roomManager.js";

const socketMeta = new Map(); // socket.id -> { roomCode, clientId }

function registerSocketHandlers(io, socket) {
  function getRoomAndClient() {
    const meta = socketMeta.get(socket.id);
    if (!meta) return {};
    return { room: getRoom(meta.roomCode), clientId: meta.clientId, roomCode: meta.roomCode };
  }

  socket.on("room:create", ({ userName, clientId }) => {
    if (!clientId) return;
    const room = createRoom(clientId, socket.id, userName || "Host");
    socket.join(room.code);
    socketMeta.set(socket.id, { roomCode: room.code, clientId });
    socket.emit("room:created", { roomCode: room.code, roomState: serializeRoom(room) });
  });

  socket.on("room:join", ({ roomCode, userName, clientId }) => {
    if (!clientId) return;
    const room = joinRoom(roomCode, clientId, socket.id, userName || "Guest");
    if (!room) {
      socket.emit("room:error", { message: "Room not found" });
      return;
    }
    socket.join(room.code);
    socketMeta.set(socket.id, { roomCode: room.code, clientId });
    socket.emit("room:joined", { roomState: serializeRoom(room) });
    io.to(room.code).emit("room:userJoined", {
      userName,
      participants: serializeRoom(room).participants,
    });
  });

  socket.on("queue:add", ({ videoId, title, thumbnail, channel, duration }) => {
    const { room } = getRoomAndClient();
    if (!room) return;
    room.queue.push({ videoId, title, thumbnail, channel, duration });
    room.lastActivity = Date.now();
    if (room.currentIndex === -1) {
      room.currentIndex = 0;
      io.to(room.code).emit("playback:play", { videoId: room.queue[0].videoId, startAt: 0 });
      room.isPlaying = true;
    }
    io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
  });

  socket.on("queue:remove", ({ index }) => {
    const { room } = getRoomAndClient();
    if (!room || index < 0 || index >= room.queue.length) return;
    room.queue.splice(index, 1);
    if (room.currentIndex >= room.queue.length) {
      room.currentIndex = room.queue.length - 1;
    }
    room.lastActivity = Date.now();
    io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
  });

  socket.on("queue:reorder", ({ from, to }) => {
    const { room } = getRoomAndClient();
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
    const { room } = getRoomAndClient();
    if (!room || index < 0 || index >= room.queue.length) return;
    room.currentIndex = index;
    room.isPlaying = true;
    room.lastActivity = Date.now();
    io.to(room.code).emit("playback:play", { videoId: room.queue[index].videoId, startAt: 0 });
    io.to(room.code).emit("queue:updated", { queue: room.queue, currentIndex: room.currentIndex });
  });

  socket.on("playback:sync", ({ videoId, currentTime, isPlaying }) => {
    const { room, clientId } = getRoomAndClient();
    if (!room) return;
    const allowed = !room.hostOnlyControl || room.hostClientId === clientId;
    if (!allowed) return;
    room.isPlaying = isPlaying;
    room.lastActivity = Date.now();
    socket.to(room.code).emit("playback:state", {
      videoId,
      currentTime,
      isPlaying,
      ts: Date.now(),
    });
  });

  socket.on("room:setControlMode", ({ hostOnlyControl }) => {
    const { room, clientId } = getRoomAndClient();
    if (!room || room.hostClientId !== clientId) return;
    room.hostOnlyControl = !!hostOnlyControl;
    room.lastActivity = Date.now();
    io.to(room.code).emit("room:controlModeChanged", { hostOnlyControl: room.hostOnlyControl });
  });

  socket.on("playback:skip", () => {
    const { room } = getRoomAndClient();
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
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    socketMeta.delete(socket.id);

    scheduleRemoval(meta.roomCode, meta.clientId, socket.id, (result) => {
      if (result.deleted) return;
      io.to(meta.roomCode).emit("room:userLeft", {
        participants: serializeRoom(result.room).participants,
        newHostClientId: result.hostMigrated ? result.room.hostClientId : undefined,
      });
    });
  });
}

export { registerSocketHandlers };
