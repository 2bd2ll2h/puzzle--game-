import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const encouragementNames = [
  "أسطوري", "خارق", "مميز", "مذهل", "رائع", "فريد", "لا يُقهر",
  "ممتاز", "رائع جدًا", "فائق", "مبهر", "مذهل", "متألق",
  "ممتاز جدًا", "لا يُضاهى", "بطل", "ممتاز للغاية",
  "متفوق", "خارق", "مذهل جدًا", "عبقري", "أسطوري جدًا"
];


const socket = io("https://puzzle-game-production-1013.up.railway.app");

export default function Puzzle({ images = [], playerName = "Player" }) {
  const [gameImages, setGameImages] = useState([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("neutral");
  const [time, setTime] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [scores, setScores] = useState([]);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [finalResults, setFinalResults] = useState(false);
  const [skipAvailable, setSkipAvailable] = useState(false);
  const [leader, setLeader] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const timerRef = useRef(null);
  const readySound = useRef(new Audio("/sounds/ready.mp3"));
  const unreadySound = useRef(new Audio("/sounds/unready.mp3"));
  const audioCtx = useRef(null);

  // تحديث الأبعاد عند تغيير حجم الشاشة





  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const playTick = () => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = "square"; osc.frequency.value = 900; gain.gain.value = 0.05;
    osc.connect(gain); gain.connect(audioCtx.current.destination);
    osc.start(); osc.stop(audioCtx.current.currentTime + 0.1);
  };

  const imgs = gameImages.length ? gameImages : images;
  const img = imgs[index];

  useEffect(() => {
    // حفظ الاسم واستعادة الحالة
    localStorage.setItem("puzzlePlayerName", playerName);
    socket.emit("join", playerName);

    socket.on("resumeGame", (data) => {
      setGameImages(data.images);
      setIndex(data.currentIndex);
      setTime(data.remainingTime);
      if (data.isFinished) setIsFinished(true);
    });








    socket.on("updateScores", (data) => {
      if (isFinished) return;
      if (!showResults && !showEncouragement && !finalResults) {
        setScores(data.scores);
        setLeader(data.leader);
      }
    });

    socket.on("globalSkipEnable", (data) => {
      if (isFinished) return;
      if (data.index === index) setSkipAvailable(true);
    });

    return () => {
      socket.off("resumeGame");
      socket.off("updateScores");
      socket.off("globalSkipEnable");
    };
  }, [playerName, index, showResults, finalResults, showEncouragement, isFinished]);

  useEffect(() => {
    if (!img || isFinished) return; 

    setAnswer("");
    setStatus("neutral");
    // تعيين الوقت فقط إذا لم يكن مسترجعاً من السيرفر
    if (time === 0) setTime(img.duration * 60);
    
    setShowResults(false);
    setSkipAvailable(false);
    socket.emit("checkSkipStatus", { index });

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) { 
          clearInterval(timerRef.current); 
          skip(); 
          return 0; 
        }
        if (t <= 3 && !isFinished) playTick(); 
        // إبلاغ السيرفر بالوقت المتبقي لمزامنة العائدين
        if (t % 2 === 0) socket.emit("syncTimer", { time: t - 1 });
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, img, isFinished]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const submit = () => {
    const isCorrect = answer.trim().toLowerCase() === img.answer.toLowerCase();
    socket.emit("playerAnswer", { isCorrect, index });
    setStatus(isCorrect ? "correct" : "wrong");
    isCorrect ? readySound.current.play().catch(() => {}) : unreadySound.current.play().catch(() => {});
  };

  const skip = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    socket.emit("requestScores");
    setSkipAvailable(false);
    if (index + 1 >= imgs.length) {
      setIsFinished(true);
      if (leader === playerName) {
        setShowEncouragement(true);
      } else {
        setShowResults(true);
        setFinalResults(true);
      }
    } else {
      setShowResults(true);
      setFinalResults(false);
    }
  };

  const nextQuestion = () => {
    if (index + 1 >= imgs.length) {
      setShowResults(true); setFinalResults(true); return;
    }
    setShowResults(false); setFinalResults(false);
    setIndex(i => i + 1);
  };

  const refreshScores = () => {
    socket.emit("requestScores");
    socket.once("updateScores", (data) => {
      setScores(data.scores);
    });
  };

  if (!imgs.length) return <div style={{ color: "white", textAlign: 'center', marginTop: '20%' }}>في انتظار بدء اللعبة...</div>;

  if (showEncouragement) {
    return (
      <div style={styles.page}>
        <div style={{...styles.resultsCard, width: isMobile ? "90%" : "70%"}}>
          <button style={styles.next} onClick={() => { setShowEncouragement(false); setFinalResults(true); setShowResults(true); }}>Skip</button>
          <h3>🎉 Congratulations to the Winner!</h3>
          <h2 style={{ marginBottom: 20 }}>{playerName} — {scores.find(p=>p.name===playerName)?.score || 0} ⭐</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", fontSize: isMobile ? 18 : 24, fontWeight: 700, color: "#0f172a" }}>
            {encouragementNames.map((n, i) => (<span key={i}>{n}</span>))}
          </div>
        </div>
      </div>
    );
  }

  if (showResults || finalResults) {
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <div style={styles.page}>
        <div style={{...styles.resultsCard, width: isMobile ? "95%" : "70%"}}>
          {!finalResults && (<div style={styles.arrow} onClick={nextQuestion}>⬆️</div>)}
          <h2>📊 النتائج</h2>
          <ul style={{ width: "100%", padding: 0 }}>
            {scores.filter(p => p.score > 0).map((p, i) => (
              <li key={p.name} style={styles.scoreItem}>
                <span>{medals[i] || ""} {p.name}</span>
                <strong>{p.score} ⭐</strong>
              </li>
            ))}
          </ul>
          {finalResults && (
            <div style={{textAlign: 'center'}}>
              <button onClick={refreshScores} style={{padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', marginBottom: '10px'}}>🔄 Refresh</button>
              <p>مع تحيات الادمن المميز مميز جدا</p>
              <p>والمبدعة زلطه</p>
              <p>خالص تحياتي لكم العضو المبجل عبدو</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={{...styles.card, flexDirection: isMobile ? "column" : "row", height: isMobile ? "95%" : "85%"}}>
        <div style={styles.imageBox}>
          <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div style={{...styles.side, flex: isMobile ? "none" : 1}}>
          <div style={{...styles.timer, fontSize: isMobile ? 24 : 32}}>⏰ {formatTime(time)}</div>
          <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="اكتب الإجابة..." style={{ ...styles.input, background: status === "correct" ? "#22c55e" : status === "wrong" ? "#ef4444" : "#fff", color: status === "neutral" ? "#000" : "#fff" }} />
          <button onClick={submit} style={styles.submit}>Submit</button>
          {skipAvailable && (<button onClick={skip} style={styles.next}>Skip</button>)}
        </div>
      </div>
    </div>
  );
}

















const styles = {
  page: { height: "100vh", width: "100vw", background: "linear-gradient(135deg,#0f172a,#020617)", display: "flex", justifyContent: "center", alignItems: "center", overflow: 'hidden' },
  card: { width: "95%", background: "#fff", borderRadius: 16, display: "flex", gap: 20, padding: 20, boxShadow: "0 10px 40px rgba(0,0,0,.4)", overflowY: 'auto' },
  imageBox: { flex: 3, background: "#f3f3f3", borderRadius: 12, display: "flex", justifyContent: "center", alignItems: "center", minHeight: '300px' },
  side: { display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" },
  timer: { fontWeight: "bold", textAlign: "center" },
  input: { padding: 14, borderRadius: 10, border: "1px solid #ccc", fontSize: 18, width: '100%', boxSizing: 'border-box' },
  submit: { padding: 14, background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 18 },
  next: { padding: 14, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 18 },
  resultsCard: { minHeight: "60%", background: "#fff", borderRadius: 16, padding: 24, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", overflowY: 'auto' },
  arrow: { position: "absolute", top: 14, right: 20, fontSize: 28, cursor: "pointer" },
  scoreItem: { listStyle: "none", padding: 12, marginBottom: 10, background: "#f1f5f9", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 18, width: '100%', boxSizing: 'border-box' },
};