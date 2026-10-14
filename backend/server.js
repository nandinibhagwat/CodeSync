const express=require('express');
const http=require("http");
const dotenv=require("dotenv");
const cookieParser=require("cookie-parser");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");

const {Server}=require("socket.io");
const cors=require("cors");
const path=require("path");
const connectDB = require("./config/db.connection");
const Y = require("yjs");

const userRoutes=require('./routes/user.route');
const roomRoutes=require('./routes/room.route');
const aiRoutes = require("./routes/ai.route");
const Room = require("./models/Room");
const User = require("./models/User");

dotenv.config();

const app=express();
const PORT=process.env.PORT

// NOTE: the previous version of this line was
//   origin: "https://codecollab-eight.vercel.app" || "http://localhost:5173"
// which is a bug: the `||` operator only falls back when the left side is
// falsy, and a non-empty string is always truthy, so localhost was
// never actually used. ALLOWED_ORIGINS lets both work via env config.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://codecollab-eight.vercel.app,http://localhost:5173"
).split(",").map((o) => o.trim());

const corsOptions = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.use("/api/user",userRoutes);
app.use("/api/room",roomRoutes);
app.use("/api/ai", aiRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// -------------------------------------------------------------------
// Socket.IO authentication
// -------------------------------------------------------------------
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return next(new Error("Unauthorized-No token provided"));

    const cookies = cookie.parse(cookieHeader);
    const token = cookies.jwt;
    if (!token) return next(new Error("Unauthorized-No token provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return next(new Error("Unauthorized-User not found"));

    socket.data.user = { _id: String(user._id), username: user.username };
    next();
  } catch (error) {
    console.error("Socket auth error:", error.message);
    next(new Error("Unauthorized"));
  }
});

const onlineUsersInRoom = {};

// ---------------------------------------------------------------------
// Yjs room documents (fixes the "last write wins" code-sync problem)
// ---------------------------------------------------------------------
// One authoritative Y.Doc lives in memory per active room. Every client
// keeps its own replica bound to Monaco via y-monaco; edits become small
// binary "update" messages that are merged here (CRDT merge is automatic
// and order-independent) and relayed on to every other client in the
// room. The merged text is periodically flushed back to MongoDB so it
// survives server restarts and empty rooms.
const roomDocs = new Map(); // roomId -> Y.Doc
const saveTimers = new Map(); // roomId -> Timeout
const SAVE_DEBOUNCE_MS = 2000;

async function getOrCreateRoomDoc(roomId) {
  let doc = roomDocs.get(roomId);
  if (doc) return doc;

  doc = new Y.Doc();
  try {
    const room = await Room.findOne({ roomId }).select("code");
    if (room && room.code) {
      doc.getText("code").insert(0, room.code);
    }
  } catch (err) {
    console.error("Failed to seed Yjs doc from MongoDB:", err.message);
  }
  roomDocs.set(roomId, doc);
  return doc;
}

function scheduleSave(roomId) {
  clearTimeout(saveTimers.get(roomId));
  const timer = setTimeout(() => persistRoomDoc(roomId), SAVE_DEBOUNCE_MS);
  saveTimers.set(roomId, timer);
}

async function persistRoomDoc(roomId) {
  const doc = roomDocs.get(roomId);
  if (!doc) return;
  try {
    const text = doc.getText("code").toString();
    await Room.findOneAndUpdate({ roomId }, { code: text });
  } catch (err) {
    console.error("Failed to persist room code:", err.message);
  }
}

async function evictRoomDocIfEmpty(roomId) {
  if ((onlineUsersInRoom[roomId] || []).length > 0) return;
  clearTimeout(saveTimers.get(roomId));
  saveTimers.delete(roomId);
  await persistRoomDoc(roomId);
  roomDocs.delete(roomId);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);

    if (!onlineUsersInRoom[roomId]) {
        onlineUsersInRoom[roomId] = [];
    }

    const userWithSocket = {
        _id: socket.data.user._id,
        username: socket.data.user.username,
        socketId: socket.id
    };

    // Peers already in the room when this socket joins. The newcomer is
    // the one who will initiate the WebRTC offer to each of them (see
    // "existing-peers" below) — a single, consistent initiator avoids
    // both sides racing to call createOffer() at once ("glare").
    // Filtered by socketId so a second tab from the same user is still
    // treated as a distinct peer to connect to.
    const existingPeers = onlineUsersInRoom[roomId].filter(
        (u) => u.socketId !== socket.id
    );

    onlineUsersInRoom[roomId].push(userWithSocket);

    io.to(roomId).emit("room-users", onlineUsersInRoom[roomId]);
    socket.emit("existing-peers", existingPeers);
    });


    socket.on("leave-room", async ({ roomId }) => {
    if (onlineUsersInRoom[roomId]) {
      onlineUsersInRoom[roomId] = onlineUsersInRoom[roomId].filter(
        (u) => u.socketId !== socket.id
      );
    }

    socket.leave(roomId);
    io.to(roomId).emit("room-users", onlineUsersInRoom[roomId] || []);
    await evictRoomDocIfEmpty(roomId);
  });

  socket.on("disconnecting", async () => {
    const affectedRooms = [];
    for (const roomId of socket.rooms) {
      if (onlineUsersInRoom[roomId]) {
        onlineUsersInRoom[roomId] = onlineUsersInRoom[roomId].filter(
          (u) => u.socketId !== socket.id
        );
        io.to(roomId).emit("room-users", onlineUsersInRoom[roomId]);
        affectedRooms.push(roomId);
      }
    }
    for (const roomId of affectedRooms) {
      await evictRoomDocIfEmpty(roomId);
    }
  });

  // -------------------------------------------------------------
  // Yjs sync: replaces the old naive "code-change" / "code-update"
  // last-write-wins broadcast.
  // -------------------------------------------------------------
  socket.on("yjs-join", async ({ roomId }) => {
    socket.join(roomId); // defensive: usually already joined via join-room
    const doc = await getOrCreateRoomDoc(roomId);
    const state = Y.encodeStateAsUpdate(doc);
    socket.emit("yjs-init", Array.from(state));
  });

  socket.on("yjs-update", ({ roomId, update }) => {
    const doc = roomDocs.get(roomId);
    if (!doc) return; // client must yjs-join before sending updates
    const u8 = new Uint8Array(update);
    Y.applyUpdate(doc, u8);
    socket.to(roomId).emit("yjs-update", update); // relay to everyone else
    scheduleSave(roomId);
  });

  // -------------------------------------------------------------
  // WebRTC signaling relay (previously missing entirely — offers,
  // answers, and ICE candidates had nowhere to go).
  // Routed by socket id, not user id, since a single user could in
  // theory have multiple tabs/sockets open.
  // -------------------------------------------------------------
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// if(process.env.NODE_ENV === "production") {
//     app.use(express.static(path.join(__dirname, "../frontend/dist")));
//     app.get("/*", (req, res, next) => {
//       if (req.originalUrl.startsWith("/api")) return next(); // Skip API
//       res.sendFile(path.join(frontendDistPath, "index.html"));
//     });
//   }

//   app._router.stack
//   .filter(r => r.route)
//   .forEach(r => console.log(Object.keys(r.route.methods)[0].toUpperCase(), r.route.path));


// -------------------------------------------------------------------
// Graceful shutdown: flush every in-memory Yjs doc to MongoDB so edits
// inside the last SAVE_DEBOUNCE_MS window aren't lost on restart/kill.
// -------------------------------------------------------------------
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;          // guard against double-fire
  shuttingDown = true;
  console.log(`\n${signal} received — flushing room docs…`);

  const roomIds = [...roomDocs.keys()];
  const results = await Promise.allSettled(
    roomIds.map((roomId) => persistRoomDoc(roomId))
  );

  let flushed = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      flushed++;
    } else {
      console.error(`Failed to flush room ${roomIds[i]}:`, r.reason);
    }
  });
  console.log(`Flushed ${flushed}/${roomIds.length} room(s) to MongoDB.`);

  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

server.listen(PORT,()=>{
    console.log(`Server is running on PORT:${PORT}`);
    connectDB();
})
