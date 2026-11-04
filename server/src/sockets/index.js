// server/src/sockets/index.js
// Realtime layer: live-class rooms (WebRTC mesh signalling, presence, chat,
// hand-raise, reactions, polls, waiting room, moderator controls) plus
// per-user notification channels.
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import {
  User,
  LiveClass,
  Enrollment,
  ChatMessage,
  Poll,
} from "../models/index.js";

let ioRef = null;
export const getIo = () => ioRef;

// roomName -> Map<socketId, peer>
const rooms = new Map();
// roomName -> Map<socketId, waiter>
const waiting = new Map();
// roomName -> strokes drawn on the shared whiteboard (in-memory, capped)
const boards = new Map();

const peersIn = (roomName) => rooms.get(roomName) || new Map();

// The connection handler must register listeners synchronously, otherwise an
// event emitted the instant the client connects can arrive before its handler
// exists. Profile data is loaded lazily instead.
async function ensureProfile(socket) {
  if (socket.profile === undefined) {
    socket.profile = (await User.findById(socket.userId).select("name avatar").catch(() => null)) || {};
  }
  return socket.profile;
}

function peerOf(socket, isHost) {  return {
    socketId: socket.id,
    userId: socket.userId,
    name: socket.profile?.name || "Learner",
    role: socket.role,
    avatar: socket.profile?.avatar || "",
    isHost: !!isHost,
    handRaised: false,
    micOn: true,
    camOn: true,
    sharing: false,
    joinedAt: new Date().toISOString(),
  };
}

async function isModerator(user, cls) {
  if (user.role === "admin") return true;
  if (String(cls.instructor) === String(user._id)) return true;
  return (cls.cohosts || []).some((c) => String(c) === String(user._id));
}

async function canAttend(user, cls) {
  if (await isModerator({ _id: user._id, role: user.role }, cls)) return true;
  const enr = await Enrollment.findOne({ course: cls.course, student: user._id });
  return !!enr;
}

async function systemMessage(cls, text) {
  const doc = await ChatMessage.create({
    liveClass: cls._id,
    roomName: cls.roomName,
    kind: "system",
    message: text,
  });
  ioRef?.to(cls.roomName).emit("chat:message", {
    _id: String(doc._id),
    kind: "system",
    message: doc.message,
    createdAt: doc.createdAt,
  });
}

function moderatorIds(cls) {
  const ids = new Set([String(cls.instructor)]);
  (cls.cohosts || []).forEach((c) => ids.add(String(c)));
  return [...ids];
}

function broadcastPeers(roomName) {
  ioRef.to(roomName).emit("room:peers", { peers: [...peersIn(roomName).values()] });
}

async function refreshModerators(cls) {
  const mods = moderatorIds(cls);
  const room = peersIn(cls.roomName);
  room.forEach((p) => (p.isHost = mods.includes(String(p.userId)) || p.role === "admin"));
  ioRef.to(cls.roomName).emit("room:peers", { peers: [...room.values()] });
  ioRef.to(cls.roomName).emit("live:moderators", { mods });
}

async function enterRoom(socket, cls, peer) {
  const room = cls.roomName;
  if (!rooms.has(room)) rooms.set(room, new Map());
  const peers = peersIn(room);
  const existing = [...peers.values()];
  peers.set(socket.id, peer);
  socket.roomName = room;
  socket.classId = String(cls._id);
  socket.leave(room + "::wait");
  const q = waiting.get(room);
  if (q) q.delete(socket.id);
  socket.waitingFor = null;
  socket.join(room);
  if (peer.isHost) socket.join(room + "::wait");
  ioRef.to(room + "::wait").emit("wait:list", { waiters: [...(waiting.get(room)?.values() || [])] });

  const history = await ChatMessage.find({ roomName: room }).sort({ createdAt: 1 }).limit(200).lean();
  const openPoll = await Poll.findOne({ liveClass: cls._id, status: "open" }).lean();
  socket.emit("room:joined", {
    classId: String(cls._id),
    roomName: room,
    status: cls.status,
    isHost: peer.isHost,
    waitingRoom: !!cls.waitingRoom,
    peers: existing,
    moderators: moderatorIds(cls),
    activePoll: openPoll ? sanitizePoll(openPoll) : null,
  });
  socket.emit("chat:history", { messages: history });

  socket.to(room).emit("room:peer-joined", { peer });
  cls.participantCount = peers.size;
  if (!cls.attendees.some((a) => String(a) === String(socket.userId))) cls.attendees.push(socket.userId);
  cls.peakViewers = Math.max(cls.peakViewers || 0, peers.size);
  await cls.save();
  broadcastPeers(room);
  await systemMessage(cls, `${peer.name}${peer.isHost ? " (Instructor)" : ""} joined the room`);
}

function sanitizePoll(p) {
  return {
    _id: String(p._id),
    question: p.question,
    options: (p.options || []).map((o, i) => ({ index: i, text: o.text, votes: (o.votes || []).map(String) })),
    status: p.status,
    createdBy: String(p.createdBy),
  };
}

export async function leaveRoom(socket) {
  if (socket.waitingFor) {
    const room = socket.waitingFor;
    const q = waiting.get(room);
    const waiter = q?.get(socket.id);
    if (q) q.delete(socket.id);
    if (q && q.size === 0) waiting.delete(room);
    if (waiter) ioRef?.to(room + "::wait").emit("wait:list", { waiters: [...(q?.values() || [])] });
    socket.waitingFor = null;
  }
  if (!socket.roomName) return;
  const roomName = socket.roomName;
  const peers = peersIn(roomName);
  const me = peers.get(socket.id);
  peers.delete(socket.id);
  if (peers.size === 0) rooms.delete(roomName);
  socket.to(roomName).emit("room:peer-left", { socketId: socket.id });
  broadcastPeers(roomName);
  socket.roomName = null;
  try {
    const cls = await LiveClass.findById(socket.classId);
    if (cls) {
      cls.participantCount = Math.max(0, peers.size);
      await cls.save();
      if (me) await systemMessage(cls, `${me.name} left the room`);
    }
  } catch { /* best-effort cleanup */ }
}

export function attachSockets(httpServer, origins) {
  const io = new Server(httpServer, {
    cors: { origin: origins, methods: ["GET", "POST"] },
  });
  ioRef = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("Token required");
      const p = jwt.verify(token, process.env.JWT_SECRET || "dev_only_change_me");
      socket.userId = p.sub;
      socket.role = p.role;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);

    socket.on("room:join", async ({ classId }) => {
      try {
        await ensureProfile(socket);
        const cls = await LiveClass.findById(classId);
        if (!cls) return socket.emit("room:error", { message: "Class not found" });
        if (["ended", "cancelled"].includes(cls.status))
          return socket.emit("room:error", { message: "This session is no longer running" });
        const ok = await canAttend({ _id: socket.userId, role: socket.role }, cls);
        if (!ok)
          return socket.emit("room:error", { message: "Enroll in the course to join this live class" });

        const mod = await isModerator({ _id: socket.userId, role: socket.role }, cls);
        const peer = peerOf(socket, mod);

        if (!mod && cls.waitingRoom) {
          if (!waiting.has(cls.roomName)) waiting.set(cls.roomName, new Map());
          waiting.get(cls.roomName).set(socket.id, { ...peer, waitingSince: new Date().toISOString() });
          socket.waitingFor = cls.roomName;
          socket.join(cls.roomName + "::wait");
          socket.emit("room:waiting", { title: cls.title });
          io.to(cls.roomName + "::wait").emit("wait:list", {
            waiters: [...(waiting.get(cls.roomName)?.values() || [])],
          });
          return;
        }
        await enterRoom(socket, cls, peer);
      } catch (e) {
        console.warn("room:join error:", e.message);
        socket.emit("room:error", { message: "Could not join the room" });
      }
    });

    // ── waiting room (moderators) ─────────────────────────────────
    socket.on("wait:list", async () => {
      if (!socket.roomName) return;
      io.to(socket.id).emit("wait:list", { waiters: [...(waiting.get(socket.roomName)?.values() || [])] });
    });
    socket.on("wait:approve", async ({ socketId }) => {
      if (!socket.roomName) return;
      const cls = await LiveClass.findById(socket.classId);
      if (!cls) return;
      if (!(await isModerator({ _id: socket.userId, role: socket.role }, cls))) return;
      const target = io.sockets.sockets.get(socketId);
      const waiter = waiting.get(cls.roomName)?.get(socketId);
      if (!target || !waiter) return;
      delete waiter.waitingSince;
      await enterRoom(target, cls, waiter);
    });
    socket.on("wait:deny", async ({ socketId }) => {
      if (!socket.roomName) return;
      const cls = await LiveClass.findById(socket.classId);
      if (!cls) return;
      if (!(await isModerator({ _id: socket.userId, role: socket.role }, cls))) return;
      const target = io.sockets.sockets.get(socketId);
      const q = waiting.get(cls.roomName);
      if (q) q.delete(socketId);
      if (target) {
        target.emit("wait:denied", {});
        target.leave(cls.roomName + "::wait");
        target.waitingFor = null;
      }
      io.to(cls.roomName + "::wait").emit("wait:list", { waiters: [...(q?.values() || [])] });
    });

    // ── WebRTC signalling ─────────────────────────────────────────
    socket.on("rtc:signal", ({ to, signal }) => {
      if (typeof to === "string" && to.length < 128 && signal && typeof signal === "object")
        io.to(to).emit("rtc:signal", { from: socket.id, signal });
    });

    // ── chat ──────────────────────────────────────────────────────
    socket.on("chat:message", async ({ message }) => {
      if (!socket.roomName || typeof message !== "string") return;
      const text = message.trim().slice(0, 2000);
      if (!text) return;
      await ensureProfile(socket);
      const me = peersIn(socket.roomName).get(socket.id);
      const doc = await ChatMessage.create({
        liveClass: socket.classId,
        roomName: socket.roomName,
        user: socket.userId,
        userName: me?.name || socket.profile?.name || "Learner",
        userRole: socket.role,
        avatar: socket.profile?.avatar || "",
        message: text,
      });
      io.to(socket.roomName).emit("chat:message", {
        _id: String(doc._id),
        user: String(socket.userId),
        userName: doc.userName,
        userRole: doc.userRole,
        avatar: doc.avatar,
        kind: "chat",
        message: text,
        createdAt: doc.createdAt,
      });
    });

    socket.on("chat:typing", async () => {
      if (!socket.roomName) return;
      const profile = await ensureProfile(socket);
      socket.to(socket.roomName).emit("chat:typing", { user: profile?.name || "Someone" });
    });

    // ── presence state ────────────────────────────────────────────
    socket.on("live:state", ({ micOn, camOn, sharing }) => {
      if (!socket.roomName) return;
      const peer = peersIn(socket.roomName).get(socket.id);
      if (!peer) return;
      if (typeof micOn === "boolean") peer.micOn = micOn;
      if (typeof camOn === "boolean") peer.camOn = camOn;
      if (typeof sharing === "boolean") peer.sharing = sharing;
      broadcastPeers(socket.roomName);
    });

    socket.on("live:hand", ({ raised }) => {
      if (!socket.roomName) return;
      const peer = peersIn(socket.roomName).get(socket.id);
      if (!peer) return;
      peer.handRaised = !!raised;
      broadcastPeers(socket.roomName);
      if (raised) {
        [...peersIn(socket.roomName).values()]
          .filter((p) => p.isHost && p.socketId !== socket.id)
          .forEach((h) => io.to(h.socketId).emit("live:hand-raise", { name: peer.name }));
      }
    });

    // ── reactions ─────────────────────────────────────────────────
    const REACTION_SET = new Set(["👍", "👎", "👏", "🙌", "❤️", "😂", "😮", "🎉", "💡", "✍️"]);
    socket.on("live:reaction", async ({ emoji }) => {
      if (!socket.roomName || !REACTION_SET.has(emoji)) return;
      const peer = peersIn(socket.roomName).get(socket.id);
      io.to(socket.roomName).emit("live:reaction", { emoji, name: peer?.name || "Someone" });
      if (emoji === "✍️" && peer && !peer.isHost) {
        peer.handRaised = true;
        broadcastPeers(socket.roomName);
        [...peersIn(socket.roomName).values()]
          .filter((p) => p.isHost && p.socketId !== socket.id)
          .forEach((h) => io.to(h.socketId).emit("live:hand-raise", { name: peer.name }));
      }
    });

    // ── shared whiteboard ───────────────────────────────────────
    const readStroke = (raw) => {
      if (!raw || !Array.isArray(raw.points)) return null;
      const points = raw.points
        .slice(0, 500)
        .map((p) => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : null))
        .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= 0 && p[0] <= 1 && p[1] >= 0 && p[1] <= 1);
      if (points.length < 2) return null;
      const size = Math.min(40, Math.max(1, Number(raw.size) || 4));
      const color = /^#[0-9a-f]{6}$/i.test(String(raw.color || "")) ? String(raw.color) : "#ffffff";
      return { points, size, color, erase: !!raw.erase, by: socket.id };
    };

    socket.on("wb:stroke", ({ stroke } = {}) => {
      if (!socket.roomName) return;
      const s = readStroke(stroke);
      if (!s) return;
      const list = boards.get(socket.roomName) || [];
      list.push(s);
      boards.set(socket.roomName, list.slice(-400));
      socket.to(socket.roomName).emit("wb:stroke", { stroke: s });
    });

    socket.on("wb:clear", async () => {
      if (!socket.roomName) return;
      const cls = await LiveClass.findById(socket.classId);
      if (!cls || !(await isModerator({ _id: socket.userId, role: socket.role }, cls))) return;
      boards.set(socket.roomName, []);
      socket.to(socket.roomName).emit("wb:clear", {});
    });

    socket.on("wb:sync", () => {
      if (!socket.roomName) return;
      socket.emit("wb:strokes", { strokes: boards.get(socket.roomName) || [] });
    });

    // ── polls ─────────────────────────────────────────────────────
    socket.on("poll:create", async ({ question, options }) => {
      if (!socket.roomName) return;
      const cls = await LiveClass.findById(socket.classId);
      if (!cls || !(await isModerator({ _id: socket.userId, role: socket.role }, cls))) return;
      const opts = [...new Set((Array.isArray(options) ? options : []).map((o) => String(o || "").trim()).filter(Boolean))].slice(0, 6);
      if (typeof question !== "string" || !question.trim() || opts.length < 2)
        return socket.emit("poll:error", { message: "Need a question and at least 2 distinct options" });
      const poll = await Poll.create({
        liveClass: cls._id,
        roomName: cls.roomName,
        question: question.trim().slice(0, 400),
        options: opts.map((text) => ({ text, votes: [] })),
        createdBy: socket.userId,
      });
      io.to(cls.roomName).emit("poll:open", { poll: sanitizePoll(poll) });
      await systemMessage(cls, `New poll: "${poll.question}"`);
    });

    socket.on("poll:vote", async ({ pollId, index }) => {
      if (!socket.roomName) return;
      const poll = await Poll.findOne({ _id: pollId, roomName: socket.roomName, status: "open" });
      if (!poll) return;
      const i = Number(index);
      if (!Number.isInteger(i) || i < 0 || i >= poll.options.length) return;
      poll.options.forEach((o) => {
        o.votes = o.votes.filter((v) => String(v) !== String(socket.userId));
      });
      poll.options[i].votes.push(socket.userId);
      await poll.save();
      io.to(socket.roomName).emit("poll:update", { poll: sanitizePoll(poll) });
    });

    socket.on("poll:close", async ({ pollId }) => {
      if (!socket.roomName) return;
      const cls = await LiveClass.findById(socket.classId);
      if (!cls || !(await isModerator({ _id: socket.userId, role: socket.role }, cls))) return;
      const poll = await Poll.findOneAndUpdate({ _id: pollId, liveClass: cls._id }, { status: "closed" }, { new: true });
      if (poll) io.to(cls.roomName).emit("poll:update", { poll: sanitizePoll(poll) });
    });

    // ── moderator controls ────────────────────────────────────────
    const withModerator = async (fn) => {
      if (!socket.roomName) return;
      const cls = await LiveClass.findById(socket.classId);
      if (!cls || !(await isModerator({ _id: socket.userId, role: socket.role }, cls))) return;
      await fn(cls);
    };

    socket.on("host:mute", ({ targetSocketId }) =>
      withModerator(() => {
        if (targetSocketId !== socket.id) io.to(targetSocketId).emit("force:mute", {});
      }),
    );

    socket.on("host:mute-all", () =>
      withModerator((cls) => {
        [...peersIn(cls.roomName).values()]
          .filter((p) => !p.isHost && p.socketId !== socket.id)
          .forEach((p) => io.to(p.socketId).emit("force:mute", {}));
      }),
    );

    socket.on("host:kick", ({ targetSocketId }) =>
      withModerator(async (cls) => {
        const target = io.sockets.sockets.get(targetSocketId);
        const peer = peersIn(cls.roomName).get(targetSocketId);
        if (!target || !peer || peer.isHost) return;
        target.emit("force:kick", {});
        await leaveRoom(target);
        target.disconnect(true);
      }),
    );

    socket.on("live:cohost", async ({ userId, on }) => {
      if (!socket.roomName) return;
      const cls = await LiveClass.findById(socket.classId);
      if (!cls) return;
      if (socket.role !== "admin" && String(cls.instructor) !== String(socket.userId))
        return; // only the main host or admin can appoint co-hosts
      const id = String(userId || "");
      const list = (cls.cohosts || []).map(String);
      if (on && !list.includes(id) && id !== String(cls.instructor)) list.push(id);
      if (!on) cls.cohosts = (cls.cohosts || []).filter((c) => String(c) !== id);
      else cls.cohosts = list;
      await cls.save();
      await refreshModerators(cls);
    });

    socket.on("live:settings", ({ waitingRoom }) =>
      withModerator(async (cls) => {
        if (typeof waitingRoom !== "boolean") return;
        cls.waitingRoom = waitingRoom;
        await cls.save();
        io.to(cls.roomName).emit("live:settings", { waitingRoom });
      }),
    );

    socket.on("live:status", async ({ classId, status }) => {
      try {
        if (!["live", "ended"].includes(status)) return;
        if (socket.role !== "instructor" && socket.role !== "admin") return;
        const lc = await LiveClass.findById(classId);
        if (!lc) return;
        const mod = await isModerator({ _id: socket.userId, role: socket.role }, lc);
        if (!mod) return;
        lc.status = status;
        if (status === "live") {
          lc.startedAt = new Date();
          lc.reminderSentAt = lc.reminderSentAt || new Date();
        }
        if (status === "ended") {
          lc.endedAt = new Date();
          for (const [room] of [...rooms]) if (room === lc.roomName) rooms.delete(room);
          waiting.delete(lc.roomName);
          boards.delete(lc.roomName);
        }
        await lc.save();
        io.to(lc.roomName).emit("live:status", { classId: String(lc._id), status });
      } catch (e) {
        console.warn("live:status error:", e.message);
      }
    });

    socket.on("room:leave", () => leaveRoom(socket));
    socket.on("disconnect", () => leaveRoom(socket));
  });

  return io;
}

// Used by the scheduler to flip a class live/ended and tell every open room.
export async function forceClassStatus(classId, status) {
  const lc = await LiveClass.findById(classId);
  if (!lc) return;
  lc.status = status;
  if (status === "live") lc.startedAt = lc.startedAt || new Date();
  if (status === "ended") {
    lc.endedAt = lc.endedAt || new Date();
    rooms.delete(lc.roomName);
    waiting.delete(lc.roomName);
    boards.delete(lc.roomName);
  }
  await lc.save();
  ioRef?.to(lc.roomName).emit("live:status", { classId: String(lc._id), status });
  if (status === "ended") await systemMessage(lc, "The session has ended. Thank you for attending!");
}
