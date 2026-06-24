import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import { registerSocketHandlers } from "./socketHandlers.js";
import { cleanupInactiveRooms } from "./roomManager.js";
import { searchVideos } from "./youtubeApi.js";

dotenv.config();

const PORT = process.env.PORT || 3001;
const CLIENT_URLS = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim());

const app = express();
app.use(cors({ origin: CLIENT_URLS }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Missing query parameter q" });
  }
  try {
    const results = await searchVideos(q);
    res.json({ results });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

const httpServer = createServer(app);
// Socket.IO origin check is relaxed (unlike the REST API above) so the
// Electron desktop pet companion -- which loads from a file:// origin, not
// a normal web origin -- can connect. Room codes are random and unguessable,
// so this isn't a meaningful attack surface for a hobby project.
const io = new Server(httpServer, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

setInterval(cleanupInactiveRooms, 5 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`YT Jam server listening on port ${PORT}`);
});
