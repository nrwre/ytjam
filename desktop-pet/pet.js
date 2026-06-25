const { ipcRenderer } = require("electron");
const { io } = require("socket.io-client");

const GENRE_EMOJI = {
  rap: "🎤",
  edm: "🎧",
  classical: "🎻",
  devotional: "🛕",
  pop: "🎤",
  lofi: "🌙",
  other: "🎵",
};

const GENRE_GLOW = {
  rap: "#a855f7",
  edm: "#22d3ee",
  classical: "#facc15",
  devotional: "#fb923c",
  pop: "#f472b6",
  lofi: "#818cf8",
  other: "#94a3b8",
};

const IMAGE_EXTENSIONS = ["png", "gif", "webp", "jpg", "jpeg"];

function trySpriteImage(key, extIndex, imageEl, emojiEl) {
  if (extIndex >= IMAGE_EXTENSIONS.length) {
    imageEl.style.display = "none";
    emojiEl.style.display = "inline-block";
    return;
  }
  imageEl.onerror = () => trySpriteImage(key, extIndex + 1, imageEl, emojiEl);
  imageEl.onload = () => {
    imageEl.style.display = "inline-block";
    emojiEl.style.display = "none";
  };
  imageEl.src = `sprites/${key}.${IMAGE_EXTENSIONS[extIndex]}`;
}

function setGenre(genre) {
  const key = genre || "other";
  const imageEl = document.getElementById("companionImage");
  const emojiEl = document.getElementById("companionEmoji");
  emojiEl.textContent = GENRE_EMOJI[key] || GENRE_EMOJI.other;
  trySpriteImage(key, 0, imageEl, emojiEl);
  document.getElementById("companionShadow").style.background = GENRE_GLOW[key] || GENRE_GLOW.other;
  document.getElementById("companionLabel").textContent = key.toUpperCase();
}

function showCompanion() {
  document.getElementById("setup").style.display = "none";
  document.getElementById("companion").style.display = "flex";
}

function showError(message) {
  document.getElementById("setupError").textContent = message;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderChatHistory(messages) {
  const panel = document.getElementById("chatPanel");
  panel.innerHTML = (messages || [])
    .map((m) => `<div class="msg"><span class="sender">${escapeHtml(m.name)}:</span>${escapeHtml(m.text)}</div>`)
    .join("");
  panel.scrollTop = panel.scrollHeight;
}

function appendChatMessage(m) {
  const panel = document.getElementById("chatPanel");
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `<span class="sender">${escapeHtml(m.name)}:</span>${escapeHtml(m.text)}`;
  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;
}

let chatVisible = false;
document.getElementById("chatToggle").addEventListener("click", () => {
  chatVisible = !chatVisible;
  document.getElementById("chatPanel").style.display = chatVisible ? "block" : "none";
  ipcRenderer.send("companion:setChatVisible", chatVisible);
});

let activeSocket = null;

function joinRoom(serverUrl, roomCode) {
  if (!serverUrl || !roomCode) {
    showError("Enter both server URL and room code");
    return;
  }

  activeSocket?.disconnect();
  const socket = io(serverUrl, { transports: ["websocket", "polling"] });
  activeSocket = socket;

  socket.on("connect", () => {
    socket.emit("room:spectate", { roomCode });
  });

  socket.on("room:spectateJoined", ({ roomState }) => {
    showCompanion();
    setGenre(roomState.currentGenre);
    renderChatHistory(roomState.chatHistory);
  });

  socket.on("room:error", ({ message }) => {
    showError(message);
  });

  socket.on("playback:play", ({ genre }) => {
    setGenre(genre);
  });

  socket.on("chat:message", (message) => {
    appendChatMessage(message);
  });

  socket.on("connect_error", () => {
    showError("Could not reach server");
  });
}

document.getElementById("joinBtn").addEventListener("click", () => {
  const serverUrl = document.getElementById("serverUrl").value.trim();
  const roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  joinRoom(serverUrl, roomCode);
});

document.getElementById("closeBtn").addEventListener("click", () => {
  ipcRenderer.send("companion:quit");
});

ipcRenderer.on("companion:autojoin", (event, { server, room }) => {
  document.getElementById("serverUrl").value = server;
  document.getElementById("roomCode").value = room.toUpperCase();
  joinRoom(server, room.toUpperCase());
});
