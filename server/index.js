import express from "express";
import { createServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map();

app.use(express.static(path.join(rootDir, "web")));
app.get("/health", (_req, res) => res.json({ ok: true }));

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { controller: null, android: null });
  }
  return rooms.get(roomId);
}

function send(ws, message) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", reason: "Invalid JSON" });
      return;
    }

    if (message.type === "join") {
      const roomId = String(message.roomId || "").trim();
      const role = message.role === "android" ? "android" : "controller";
      if (!roomId) {
        send(ws, { type: "error", reason: "roomId is required" });
        return;
      }

      const room = getRoom(roomId);
      room[role] = ws;
      ws.roomId = roomId;
      ws.role = role;
      send(ws, { type: "joined", roomId, role });
      send(room.controller, {
        type: "status",
        androidOnline: Boolean(room.android && room.android.readyState === WebSocket.OPEN)
      });
      send(room.android, {
        type: "status",
        controllerOnline: Boolean(room.controller && room.controller.readyState === WebSocket.OPEN)
      });
      return;
    }

    if (!ws.roomId || !ws.role) {
      send(ws, { type: "error", reason: "Join a room first" });
      return;
    }

    const room = getRoom(ws.roomId);
    const target = ws.role === "controller" ? room.android : room.controller;
    send(target, { ...message, from: ws.role });
  });

  ws.on("close", () => {
    if (!ws.roomId || !ws.role) return;
    const room = rooms.get(ws.roomId);
    if (!room) return;
    if (room[ws.role] === ws) room[ws.role] = null;
    send(room.controller, { type: "status", androidOnline: Boolean(room.android) });
    send(room.android, { type: "status", controllerOnline: Boolean(room.controller) });
    if (!room.controller && !room.android) rooms.delete(ws.roomId);
  });
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => {
  console.log(`Remote control MVP running at http://localhost:${port}`);
});
