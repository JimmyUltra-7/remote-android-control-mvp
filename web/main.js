const statusEl = document.querySelector("#status");
const roomEl = document.querySelector("#room");
const connectEl = document.querySelector("#connect");
const screenEl = document.querySelector("#screen");
const textInputEl = document.querySelector("#textInput");
const sendTextEl = document.querySelector("#sendText");

let ws;
let pointerStart = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function send(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    setStatus("还没有连接信令服务");
    return;
  }
  ws.send(JSON.stringify(message));
}

function connect() {
  const roomId = roomEl.value.trim();
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.addEventListener("open", () => {
    send({ type: "join", role: "controller", roomId });
    setStatus(`已连接房间 ${roomId}，等待 Android 上线`);
  });

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "status") {
      setStatus(message.androidOnline ? "Android 在线，可以控制" : "Android 未上线");
    }
    if (message.type === "answer" || message.type === "candidate") {
      console.log("WebRTC signaling message:", message);
    }
    if (message.type === "error") {
      setStatus(message.reason);
    }
  });

  ws.addEventListener("close", () => setStatus("连接已断开"));
}

function normalizedPoint(event) {
  const rect = screenEl.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  };
}

function showTap(point) {
  const dot = document.createElement("span");
  dot.className = "tap";
  dot.style.left = `${point.x * 100}%`;
  dot.style.top = `${point.y * 100}%`;
  screenEl.append(dot);
  window.setTimeout(() => dot.remove(), 700);
}

screenEl.addEventListener("pointerdown", (event) => {
  screenEl.setPointerCapture(event.pointerId);
  pointerStart = { ...normalizedPoint(event), time: Date.now() };
});

screenEl.addEventListener("pointerup", (event) => {
  if (!pointerStart) return;
  const end = normalizedPoint(event);
  const dx = Math.abs(end.x - pointerStart.x);
  const dy = Math.abs(end.y - pointerStart.y);
  const durationMs = Date.now() - pointerStart.time;

  if (dx < 0.025 && dy < 0.025 && durationMs < 350) {
    showTap(end);
    send({ type: "tap", x: end.x, y: end.y });
  } else {
    send({
      type: "swipe",
      fromX: pointerStart.x,
      fromY: pointerStart.y,
      toX: end.x,
      toY: end.y,
      durationMs: Math.max(150, durationMs)
    });
  }

  pointerStart = null;
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => send({ type: "key", key: button.dataset.command }));
});

sendTextEl.addEventListener("click", () => {
  const text = textInputEl.value;
  if (text) send({ type: "text", text });
});

connectEl.addEventListener("click", connect);
