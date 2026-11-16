// 100% Free Serverless P2P Online Multiplayer
// Host = Player 1 (-Z side), Guest = Player 2 (+Z side, mirrored camera)
// Dual transport:
// 1) BroadcastChannel (0ms same-device / multi-tab instant connection)
// 2) WebRTC DataChannel via dynamic PeerJS CDN import (free cross-device internet P2P on Vercel/static hosts)

import { useStore, pauseAllGameTimeouts } from "./store";
import { sound } from "./sound";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const netState = {
  channel: null,
  peer: null,
  conn: null,
  roomCode: "",
  role: null, // "host" | "guest" | null
  localName: "Challenger",
  localStriker: "frost",
  connected: false,
  guestInput: { x: 0, z: 2.1, bonusRequested: false },
  latestSnapshot: null,
  lastStateSentAt: 0,
  lastInputSentAt: 0,
};

export function generateRoomCode() {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function getInviteUrl(code) {
  if (typeof window === "undefined") return "";
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  const url = new URL(
    inIframe
      ? "https://ultimate-smash-air-hockey.vercel.app/"
      : window.location.href
  );
  url.searchParams.set("room", code);
  return url.toString();
}

export function getRoomCodeFromUrl() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");
  return room ? room.trim().toUpperCase().slice(0, 6) : "";
}

function sendPacket(payload) {
  if (netState.channel) {
    try {
      netState.channel.postMessage(payload);
    } catch {
      // Ignore closed channel
    }
  }
  if (netState.conn && netState.conn.open) {
    try {
      netState.conn.send(payload);
    } catch {
      // Ignore transient WebRTC send failures
    }
  }
}

function handleRemotePeerLeft() {
  const wasConnected = netState.connected;
  netState.connected = false;
  const store = useStore.getState();
  if (store.onlineConnected) {
    store.setOnlineState({ onlineConnected: false });
  }

  if (
    wasConnected &&
    store.gameMode === "online" &&
    store.startGame &&
    !store.endGame &&
    !store.peerDisconnected
  ) {
    pauseAllGameTimeouts();
    sound.setMusicPaused(true);
    sound.playPause();
    useStore.setState({
      isPaused: true,
      peerDisconnected: true,
      casterMessage: "⚠️ OPPONENT DISCONNECTED FROM THE ARENA!",
    });
  }
}

/** Bind WebRTC DataChannel packet and disconnect listeners cleanly once per connection. */
function attachPeerLifecycle(conn) {
  conn.on("data", handleIncomingPacket);
  const onDrop = () => {
    if (netState.conn === conn) handleRemotePeerLeft();
  };
  conn.on("close", onDrop);
  conn.on("error", onDrop);
}

function handleIncomingPacket(msg) {
  if (!msg || typeof msg !== "object") return;
  const store = useStore.getState();

  if (msg.type === "bye") {
    handleRemotePeerLeft();
    return;
  }

  if (msg.type === "hello" && netState.role === "host") {
    netState.connected = true;
    store.setOnlineState({ onlineConnected: true });
    store.namePlayerTwo(msg.name || "Challenger");
    if (msg.striker) store.setPlayerTwoStriker(msg.striker);

    sendPacket({
      type: "welcome",
      hostName: store.playerOneName,
      hostStriker: store.playerOneStriker,
      puckStyle: store.puckStyle,
      arena: store.arena,
      winningScore: store.winningScore,
    });
    store.launchGame();
    return;
  }

  if (msg.type === "welcome" && netState.role === "guest") {
    netState.connected = true;
    store.setOnlineState({ onlineConnected: true });
    store.namePlayerOne(msg.hostName || "Host");
    store.namePlayerTwo(netState.localName || "Challenger");
    if (msg.hostStriker) store.setPlayerOneStriker(msg.hostStriker);
    if (netState.localStriker) store.setPlayerTwoStriker(netState.localStriker);
    if (msg.puckStyle) store.setPuckStyle(msg.puckStyle);
    if (msg.arena) store.setArena(msg.arena);
    if (msg.winningScore) store.setWinningScore(msg.winningScore);
    store.launchGame();
    return;
  }

  if (msg.type === "input" && netState.role === "host") {
    netState.guestInput.x = msg.x;
    netState.guestInput.z = msg.z;
    if (msg.bonusRequested) {
      netState.guestInput.bonusRequested = true;
    }
    return;
  }

  if (msg.type === "state" && netState.role === "guest") {
    netState.latestSnapshot = msg;
    const patch = {};
    if (msg.s1 !== store.playerOne) patch.playerOne = msg.s1;
    if (msg.s2 !== store.playerTwo) patch.playerTwo = msg.s2;
    if (Boolean(msg.endGame) !== store.endGame) patch.endGame = Boolean(msg.endGame);
    if ((msg.winner || "") !== store.winner) patch.winner = msg.winner || "";
    if ((msg.lastGoalBy || null) !== store.lastGoalBy) {
      patch.lastGoalBy = msg.lastGoalBy || null;
    }
    if ((msg.lastGoalSpeed || 0) !== store.lastGoalSpeed) {
      patch.lastGoalSpeed = msg.lastGoalSpeed || 0;
    }
    if (Object.keys(patch).length > 0) {
      useStore.setState(patch);
    }
  }
}

async function loadPeerJsSafe() {
  try {
    const mod = await import(/* @vite-ignore */ "https://esm.sh/peerjs@1.5.4?bundle");
    return mod.Peer || mod.default || null;
  } catch {
    return null;
  }
}

export async function createOnlineRoom(hostName, strikerId) {
  disconnectOnline();
  const code = generateRoomCode();
  const store = useStore.getState();

  netState.roomCode = code;
  netState.role = "host";
  netState.localName = hostName || "Host";
  netState.localStriker = strikerId || "blaze";
  netState.connected = false;
  netState.latestSnapshot = null;

  store.setGameMode("online");
  store.namePlayerOne(netState.localName);
  store.setPlayerOneStriker(netState.localStriker);
  store.setOnlineState({
    onlineRole: "host",
    roomCode: code,
    onlineConnected: false,
  });

  if (typeof BroadcastChannel !== "undefined") {
    netState.channel = new BroadcastChannel(`ssah-p2p-${code}`);
    netState.channel.onmessage = (ev) => handleIncomingPacket(ev.data);
  }

  const PeerClass = await loadPeerJsSafe();
  if (PeerClass && netState.roomCode === code) {
    try {
      const peer = new PeerClass(`ssah-room-${code}`);
      netState.peer = peer;
      peer.on("connection", (conn) => {
        netState.conn = conn;
        attachPeerLifecycle(conn);
      });
    } catch {
      // BroadcastChannel stays active if PeerJS signaling is unreachable
    }
  }

  return code;
}

export async function joinOnlineRoom(roomCode, guestName, strikerId) {
  disconnectOnline();
  const code = (roomCode || "").trim().toUpperCase();
  if (!code) return false;

  const store = useStore.getState();
  netState.roomCode = code;
  netState.role = "guest";
  netState.localName = guestName || "Challenger";
  netState.localStriker = strikerId || "frost";
  netState.connected = false;
  netState.latestSnapshot = null;

  store.setGameMode("online");
  store.namePlayerTwo(netState.localName);
  store.setPlayerTwoStriker(netState.localStriker);
  store.setOnlineState({
    onlineRole: "guest",
    roomCode: code,
    onlineConnected: false,
  });

  if (typeof BroadcastChannel !== "undefined") {
    netState.channel = new BroadcastChannel(`ssah-p2p-${code}`);
    netState.channel.onmessage = (ev) => handleIncomingPacket(ev.data);
    netState.channel.postMessage({
      type: "hello",
      name: netState.localName,
      striker: netState.localStriker,
    });
  }

  const PeerClass = await loadPeerJsSafe();
  if (PeerClass && netState.roomCode === code) {
    try {
      const peer = new PeerClass();
      netState.peer = peer;
      peer.on("open", () => {
        const conn = peer.connect(`ssah-room-${code}`, { reliable: false });
        netState.conn = conn;
        conn.on("open", () => {
          conn.send({
            type: "hello",
            name: netState.localName,
            striker: netState.localStriker,
          });
        });
        attachPeerLifecycle(conn);
      });
    } catch {
      // BroadcastChannel remains active
    }
  }

  return true;
}

export function broadcastHostSnapshot(snapshot) {
  if (netState.role !== "host" || !netState.connected) return;
  const now = performance.now();
  if (now - netState.lastStateSentAt < 18) return;
  netState.lastStateSentAt = now;
  sendPacket({ type: "state", ...snapshot });
}

export function sendGuestInput(x, z, bonusRequested = false) {
  if (netState.role !== "guest" || !netState.connected) return;
  const now = performance.now();
  if (!bonusRequested && now - netState.lastInputSentAt < 18) return;
  netState.lastInputSentAt = now;
  sendPacket({ type: "input", x, z, bonusRequested });
}

export function disconnectOnline() {
  if (netState.connected) {
    sendPacket({ type: "bye" });
    netState.connected = false;
  }
  if (netState.channel) {
    netState.channel.close();
    netState.channel = null;
  }
  if (netState.conn) {
    try {
      netState.conn.close();
    } catch {}
    netState.conn = null;
  }
  if (netState.peer) {
    try {
      netState.peer.destroy();
    } catch {}
    netState.peer = null;
  }
  netState.roomCode = "";
  netState.role = null;
  netState.connected = false;
  netState.latestSnapshot = null;
  useStore.getState().setOnlineState({
    onlineRole: null,
    roomCode: "",
    onlineConnected: false,
  });
}

if (typeof window !== "undefined") {
  const notifyPeerLeave = () => {
    if (netState.connected) {
      sendPacket({ type: "bye" });
    }
  };
  window.addEventListener("pagehide", notifyPeerLeave);
  window.addEventListener("beforeunload", notifyPeerLeave);
}
