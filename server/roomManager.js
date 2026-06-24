import crypto from "crypto";

const rooms = new Map();
const ROOM_INACTIVITY_MS = 30 * 60 * 1000;
const DISCONNECT_GRACE_MS = 20 * 1000;

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function createRoom(hostClientId, hostSocketId, hostName) {
  const code = generateRoomCode();
  const room = {
    code,
    hostClientId,
    participants: new Map([
      [hostClientId, { clientId: hostClientId, socketId: hostSocketId, name: hostName, disconnectTimer: null }],
    ]),
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    hostOnlyControl: false,
    lastActivity: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code?.toUpperCase());
}

function joinRoom(code, clientId, socketId, userName) {
  const room = getRoom(code);
  if (!room) return null;

  const existing = room.participants.get(clientId);
  if (existing) {
    if (existing.disconnectTimer) {
      clearTimeout(existing.disconnectTimer);
      existing.disconnectTimer = null;
    }
    existing.socketId = socketId;
    if (userName) existing.name = userName;
  } else {
    room.participants.set(clientId, { clientId, socketId, name: userName, disconnectTimer: null });
  }

  room.lastActivity = Date.now();
  return room;
}

function scheduleRemoval(code, clientId, socketId, onRemove) {
  const room = getRoom(code);
  if (!room) return;
  const participant = room.participants.get(clientId);
  if (!participant || participant.socketId !== socketId) return;

  participant.disconnectTimer = setTimeout(() => {
    const current = room.participants.get(clientId);
    if (!current || current.socketId !== socketId) return;

    room.participants.delete(clientId);
    room.lastActivity = Date.now();

    if (room.participants.size === 0) {
      rooms.delete(room.code);
      onRemove({ room: null, deleted: true });
      return;
    }

    let hostMigrated = false;
    if (room.hostClientId === clientId) {
      room.hostClientId = room.participants.keys().next().value;
      hostMigrated = true;
    }

    onRemove({ room, deleted: false, hostMigrated });
  }, DISCONNECT_GRACE_MS);
}

function serializeRoom(room) {
  return {
    code: room.code,
    hostClientId: room.hostClientId,
    participants: Array.from(room.participants.values()).map((p) => ({
      clientId: p.clientId,
      name: p.name,
    })),
    queue: room.queue,
    currentIndex: room.currentIndex,
    isPlaying: room.isPlaying,
    hostOnlyControl: room.hostOnlyControl,
  };
}

function cleanupInactiveRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_INACTIVITY_MS) {
      rooms.delete(code);
    }
  }
}

export {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  scheduleRemoval,
  serializeRoom,
  cleanupInactiveRooms,
};
