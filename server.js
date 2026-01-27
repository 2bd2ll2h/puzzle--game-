const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const name = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, name);
  },
});
const upload = multer({ storage });

// Game State
let savedImages = [];
let players = [];
let gameStarted = false;

const emitPlayers = () => io.emit("updatePlayers", players);

const emitScores = () => {
  const sorted = [...players].sort((a, b) => b.score - a.score).map(p => ({ name: p.name, score: p.score }));
  io.emit("updateScores", { scores: sorted, leader: sorted[0]?.name || null });
};

io.on("connection", (socket) => {
  
  socket.on("join", (name) => {
    let p = players.find(x => x.name === name);

    // إذا اللعبة بدأت وهذا اللاعب كان مسجلاً من قبل (حالة ريفرش أثناء اللعبة)
    if (gameStarted && p) {
      p.id = socket.id; // تحديث السوكيت آيدي الجديد
      socket.emit("rejoinGame", {
        currentIndex: p.currentIndex || 0,
        currentTime: p.currentTime || 0,
        score: p.score,
        images: savedImages
      });
      console.log(`Player ${name} resumed game.`);
    } else {
      // إذا كنا في الانتظار أو لاعب جديد تماماً، نحذف أي تكرار ونبدأ من الصفر
      players = players.filter(x => x.name !== name);
      players.push({ 
        id: socket.id, 
        name: name, 
        ready: false, 
        score: 0,
        currentIndex: 0,
        currentTime: 0 
      });
      console.log(`New join: ${name}`);
    }
    emitPlayers();
  });

  // تحديث تقدم اللاعب لحظة بلحظة (السؤال والوقت المتبقي)
  socket.on("updateProgress", ({ index, time }) => {
    let p = players.find(x => x.id === socket.id);
    if (p) {
      p.currentIndex = index;
      p.currentTime = time;
    }
  });

  socket.on("toggleReady", () => {
    const p = players.find(x => x.id === socket.id);
    if (p) { p.ready = !p.ready; emitPlayers(); }
  });

  socket.on("adminTriggerStart", () => {
    if (players.length > 0 && players.every(p => p.ready)) {
      gameStarted = true;
      io.emit("startCountdown", 3);
      setTimeout(() => io.emit("gameStarted", savedImages), 3000);
    } else {
      socket.emit("adminError", { msg: "مش كل اللاعبين جاهزين" });
    }
  });

  socket.on("playerAnswer", ({ isCorrect, index }) => {
    const p = players.find(x => x.id === socket.id);
    if (!p) return;
    if (isCorrect) {
        // منطق السكور الخاص بك (مثلاً أول واحد يجاوب ياخد أكتر)
        p.score += 1; 
        emitScores();
    }
  });

  socket.on("disconnect", () => {
    // إذا لم تبدأ اللعبة بعد، نحذفه تماماً ليعود لصفحة الدخول عند الريفرش
    if (!gameStarted) {
      players = players.filter(p => p.id !== socket.id);
      emitPlayers();
      console.log("Player removed from waiting list.");
    }
  });

  socket.on("resetGame", () => {
    gameStarted = false;
    players = [];
    emitPlayers();
  });





  
});

app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ filename: req.file.filename });
});

app.post("/save-image", (req, res) => {
  const { filename, originalname, duration, answer } = req.body;
  const fullUrl = `https://asset-manager--bdallahashrf110.replit.app/uploads/${filename}`;
  savedImages.push({ filename, originalname, duration: Number(duration), answer, url: fullUrl });
  res.json({ ok: true });
});

app.get("/images", (_, res) => res.json(savedImages));

server.listen(process.env.PORT || 3001, "0.0.0.0", () => console.log("Server Running"));