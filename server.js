

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





































// التأكد من وجود مجلد الرفع

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {

    fs.mkdirSync(uploadDir);

    console.log("Created uploads directory");

}













const storage = multer.diskStorage({

  destination: (_, __, cb) => cb(null, UPLOAD_DIR),

  filename: (_, file, cb) => {

    const name = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");

    cb(null, name);

  },

});

const upload = multer({ storage });

app.use("/uploads", express.static(UPLOAD_DIR));

















































if (!fs.existsSync('./uploads')) {

    fs.mkdirSync('./uploads');

}



// Game State

let savedImages = [];

let players = [];

let questionProgress = {}; // { questionIndex: { answered: false, winners: [] } }

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

  socket.on("join", (name) => {

    if (players.find(p => p.id === socket.id)) return;

    players.push({ id: socket.id, name: name       , ready: false, score: 0 });

    emitPlayers();

  });



  socket.on("requestScores", () => {

    emitScores(socket.id); // نرسل للشخص اللي طلب فقط للحفاظ على الثبات

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

    questionProgress = {}; // تصفير التقدم

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

      questionProgress[index] = { answered: true, winners: [socket.id] };

      p.score += 2;

      io.emit("globalSkipEnable", { index }); // تفعيل السكيب للكل في هذا السؤال

    } else {

      if (!questionProgress[index].winners.includes(socket.id)) {

        questionProgress[index].winners.push(socket.id);

        p.score += 1;

      }

    }

    // تحديث السكور العام (لكن البازل سيعرض لقطة ثابتة)

    emitScores();

  });



  socket.on("disconnect", () => {

    players = players.filter(p => p.id !== socket.id);

    emitPlayers();

    cancelCountdown();

  });

});













































// الكود الناقص اللي بيستلم الصورة ويخزنها

app.post("/upload", upload.single("image"), (req, res) => {

  if (!req.file) {

    return res.status(400).json({ error: "No file uploaded" });

  }

  // بنرد على الفرونت إند باسم الملف اللي اتسيف

  res.json({

    filename: req.file.filename,

    originalname: req.file.originalname,

  });

});



















































app.post("/save-image", (req, res) => {

  const { filename, originalname, duration, answer } = req.body;







  const fullUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;



  savedImages.push({

    filename, originalname,

    duration: Number(duration || 1),

    answer: answer || "",

    url: fullUrl, 

  });

  res.json({ ok: true });

});



app.get("/images", (_, res) => res.json(savedImages));





























































const PORT = process.env.PORT || 5000; 
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});





