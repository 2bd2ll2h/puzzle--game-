



























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

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const name = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, name);
  },
});
const upload = multer({ storage });
app.use("/uploads", express.static(UPLOAD_DIR));

// Game State
let savedImages = [];
let players = []; 
let questionProgress = {}; 
let gameStarted = false; // علامة لمعرفة هل اللعبة بدأت فعلاً أم لا
let countdownTimer = null;
let countdownValue = 3;

const emitPlayers = () => io.emit("updatePlayers", players);

const emitScores = (targetSocketId = null) => {
  const sorted = [...players]
    .sort((a, b) => b.score - a.score)
    .map(p => ({ name: p.name, score: p.score }));

  const data = {
    scores: sorted,
    leader: sorted[0]?.name || null
  };

  if (targetSocketId) {
    io.to(targetSocketId).emit("updateScores", data);
  } else {
    io.emit("updateScores", data);
  }
};

const allReady = () => players.length > 0 && players.every(p => p.ready);

const startCountdown = () => {
  if (countdownTimer) return;
  countdownValue = 3;
  io.emit("startCountdown", countdownValue);
  countdownTimer = setInterval(() => {
    countdownValue--;
    if (countdownValue > 0) {
      io.emit("startCountdown", countdownValue);
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      gameStarted = true; // اللعبة بدأت رسمياً
      io.emit("startCountdown", 0);
      io.emit("gameStarted", savedImages);
    }
  }, 1000);
};

const cancelCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
    io.emit("cancelCountdown");
  }
};

io.on("connection", (socket) => {
  
  // تعديل الـ Join لدعم العودة (Reconnection)
  socket.on("join", (name) => {
    // ابحث هل اللاعب ده كان موجود قبل كدة؟
    let p = players.find(x => x.name === name);
    
    if (p) {
      // لاعب قديم رجع (رسترة أو نت قطع)
      p.id = socket.id; // حدث الـ ID الجديد
      console.log(`Player ${name} reconnected with ID ${socket.id}`);
      
      // لو اللعبة شغالة، ابعتله حالته الأخيرة فوراً
      if (gameStarted) {
        socket.emit("resumeGame", {
          savedImages: savedImages,
          currentIndex: p.currentIndex || 0,
          currentScore: p.score,
          questionStartTime: p.questionStartTime // عشان يحسب الوقت المتبقي
        });
      }
    } else {
      // لاعب جديد تماماً
      players.push({ 
        id: socket.id, 
        name: name, 
        ready: false, 
        score: 0,
        currentIndex: 0, // تتبع هو في أي سؤال
        questionStartTime: null 
      });
    }
    emitPlayers();
  });

  // تحديث مكان اللاعب والوقت اللي بدأ فيه السؤال
  socket.on("updateMyProgress", ({ index }) => {
    const p = players.find(x => x.id === socket.id);
    if (p) {
      p.currentIndex = index;
      p.questionStartTime = Date.now(); // سجل لحظة دخوله السؤال
    }
  });

  socket.on("requestScores", () => {
    emitScores(socket.id);
  });

  socket.on("toggleReady", () => {
    const p = players.find(x => x.id === socket.id);
    if (!p) return;
    p.ready = !p.ready;
    emitPlayers();
    if (!p.ready) cancelCountdown();
  });

  socket.on("adminTriggerStart", () => {
    if (!allReady()) return socket.emit("adminError", { msg: "مش كل اللاعبين جاهزين" });
    questionProgress = {}; 
    startCountdown();
  });

  socket.on("checkSkipStatus", ({ index }) => {
    if (questionProgress[index] && questionProgress[index].answered) {
      socket.emit("globalSkipEnable", { index });
    }
  });

  socket.on("playerAnswer", ({ isCorrect, index }) => {
    const p = players.find(x => x.id === socket.id);
    if (!p || !isCorrect) return;

    if (!questionProgress[index]) {
      questionProgress[index] = { answered: true, winners: [p.name] };
      p.score += 2;
      io.emit("globalSkipEnable", { index }); 
    } else {
      if (!questionProgress[index].winners.includes(p.name)) {
        questionProgress[index].winners.push(p.name);
        p.score += 1;
      }
    }
    emitScores();
  });

  socket.on("disconnect", () => {
    const p = players.find(x => x.id === socket.id);
    // لو اللعبة لسه مبدأتش، امسحه عادي
    if (!gameStarted) {
        players = players.filter(pl => pl.id !== socket.id);
        emitPlayers();
        cancelCountdown();
    }
    // لو اللعبة بدأت، مش هنمسحه من الـ array عشان لما يرجع يلاقي بياناته
  });
});

app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

app.post("/save-image", (req, res) => {
  const { filename, originalname, duration, answer } = req.body;
  const fullUrl = `https://puzzle-game-production-1013.up.railway.app/uploads/${filename}`;
  savedImages.push({
    filename, originalname,
    duration: Number(duration || 1),
    answer: answer || "",
    url: fullUrl, 
  });
  res.json({ ok: true });
});
















app.get("/images", (_, res) => res.json(savedImages));

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

