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

document.getElementById("joinBtn").addEventListener("click", () => {
  const serverUrl = document.getElementById("serverUrl").value.trim();
  const roomCode = document.getElementById("roomCode").value.trim().toUpperCase();
  if (!serverUrl || !roomCode) {
    showError("Enter both server URL and room code");
    return;
  }

  const socket = io(serverUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    socket.emit("room:spectate", { roomCode });
  });

  socket.on("room:spectateJoined", ({ roomState }) => {
    showCompanion();
    setGenre(roomState.currentGenre);
  });

  socket.on("room:error", ({ message }) => {
    showError(message);
  });

  socket.on("playback:play", ({ genre }) => {
    setGenre(genre);
  });

  socket.on("connect_error", () => {
    showError("Could not reach server");
  });
});

document.getElementById("closeBtn").addEventListener("click", () => {
  ipcRenderer.send("companion:quit");
});
