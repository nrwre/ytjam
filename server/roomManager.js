import crypto from "crypto";

const rooms = new Map();
const ROOM_INACTIVITY_MS = 30 * 60 * 1000;

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function createRoom(hostSocketId, hostName) {
  const code = generateRoomCode();
  const room = {
    code,
    hostId: hostSocketId,
    participants: new Map([[hostSocketId, { id: hostSocketId, name: hostName }]]),
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    lastActivity: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code?.toUpperCase());
}

function joinRoom(code, socketId, userName) {
  const room = getRoom(code);
  if (!room) return null;
  room.participants.set(socketId, { id: socketId, name: userName });
  room.lastActivity = Date.now();
  return room;
}

function leaveRoom(code, socketId) {
  const room = getRoom(code);
  if (!room) return null;
  room.participants.delete(socketId);
  room.lastActivity = Date.now();

  if (room.participants.size === 0) {
    rooms.delete(room.code);
    return { room: null, deleted: true };
  }

  let hostMigrated = false;
  if (room.hostId === socketId) {
    room.hostId = room.participants.keys().next().value;
    hostMigrated = true;
  }

  return { room, deleted: false, hostMigrated };
}

function serializeRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    participants: Array.from(room.participants.values()),
    queue: room.queue,
    currentIndex: room.currentIndex,
    isPlaying: room.isPlaying,
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
  leaveRoom,
  serializeRoom,
  cleanupInactiveRooms,
};
