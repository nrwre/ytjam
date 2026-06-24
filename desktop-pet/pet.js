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

function getClientId() {
  let id = localStorage.getItem("ytjam_pet_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ytjam_pet_client_id", id);
  }
  return id;
}

function setGenre(genre) {
  const key = genre || "other";
  document.getElementById("petEmoji").textContent = GENRE_EMOJI[key] || GENRE_EMOJI.other;
  document.getElementById("petShadow").style.background = GENRE_GLOW[key] || GENRE_GLOW.other;
  document.getElementById("petLabel").textContent = key.toUpperCase();
}

function showPet() {
  document.getElementById("setup").style.display = "none";
  document.getElementById("pet").style.display = "flex";
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

  const clientId = getClientId();
  const socket = io(serverUrl, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    socket.emit("room:join", { roomCode, userName: "Desktop Pet", clientId });
  });

  socket.on("room:joined", ({ roomState }) => {
    showPet();
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
  ipcRenderer.send("pet:quit");
});
