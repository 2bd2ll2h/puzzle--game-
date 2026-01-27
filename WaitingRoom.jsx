import React, { useState, useEffect, useRef } from "react";
import { socket } from "./socket";

export default function WaitingRoom({ name, bgRef }) {
  const [players, setPlayers] = useState([]);
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [puzzleComponent, setPuzzleComponent] = useState(null);
  
  const joinedRef = useRef(false);
  const hasPlayedMusic = useRef(false); // قفل تشغيل الموسيقى مرة واحدة

  // ملفات الصوت
  const joinSound = useRef(new Audio("/sounds/join.mp3"));
  const readySound = useRef(new Audio("/sounds/ready.mp3"));
  const unreadySound = useRef(new Audio("/sounds/unready.mp3"));
  const startSound = useRef(new Audio("/sounds/start.mp3"));

  const bgMusic = bgRef?.current;
















useEffect(() => {
  if (!joinedRef.current) {
    socket.emit("join", name);
    joinedRef.current = true;
    joinSound.current.play().catch(() => {});

    // تشغيل الموسيقى مرة واحدة فقط
    if (!hasPlayedMusic.current && bgMusic) {
      bgMusic.loop = false; // سطر جوهري: يمنع الملف من تكرار نفسه تلقائياً
      bgMusic.currentTime = 0; // البدء من الصفر
      bgMusic.play().catch(() => {});
      hasPlayedMusic.current = true; 

      // التأكيد برمجياً: أول ما الأغنية تخلص، تقف تماماً وما تشتغلش تاني
      bgMusic.onended = () => {
        bgMusic.pause();
        bgMusic.currentTime = 0;
        console.log("الموسيقى انتهت ولن تتكرر");
      };
    }
  }

    // 2. استقبال تحديث اللاعبين (هذا ما يصلح اختفاء الكروت)
    socket.on("updatePlayers", (list) => {
      setPlayers(list);
    });

    // 3. استقبال العد التنازلي
    socket.on("startCountdown", (value) => {
      setCountdown(value);
      
      if (value === 3) {
        // إيقاف الموسيقى نهائياً عند بدء الـ 3 ثواني
        if (bgMusic) {
          bgMusic.pause();
          bgMusic.currentTime = 0; 
        }
        // تشغيل صوت البداية كاملاً
        startSound.current.currentTime = 0;
        startSound.current.play().catch(() => {});
      }
    });

    // 4. إلغاء العد
    socket.on("cancelCountdown", () => {
      setCountdown(null);
      // الموسيقى لن تعود هنا بناءً على طلبك
    });

    // 5. بدء اللعبة
    socket.on("gameStarted", async (images) => {
      const mod = await import("./Puzzle.jsx");
      const Puzzle = mod.default;
      setPuzzleComponent(<Puzzle images={images} playerName={name} />);
    });

    socket.on("adminError", (p) => {
      alert(p?.msg || "مش كل اللاعبين جاهزين");
    });

    // تنظيف الـ Sockets عند مغادرة الصفحة
    return () => {
      socket.off("updatePlayers");
      socket.off("startCountdown");
      socket.off("cancelCountdown");
      socket.off("gameStarted");
      socket.off("adminError");
    };
  }, [bgMusic, name]);

  const toggleReady = () => {
    socket.emit("toggleReady");
    if (!ready) readySound.current.play().catch(() => {});
    else unreadySound.current.play().catch(() => {});
    setReady(!ready);
  };

  if (puzzleComponent) return puzzleComponent;

  return (
    <div style={styles.page}>
      <h3 style={styles.username}>Player: {name}</h3>
      <h1 style={styles.title}>Welcome {name} 😎</h1>

      {countdown !== null && (
        <h1 style={styles.countdown}>{countdown}</h1>
      )}

      {/* عرض كروت اللاعبين */}
      <div style={styles.playersBox}>
        {players.map((p, index) => (
          <div key={p.id} style={styles.playerCard}>
            <span style={styles.playerNumber}>{index + 1}.</span>
            <div style={styles.playerInfo}>
              <span style={styles.playerName}>{p.name}</span>
              <span
                style={{
                  ...styles.status,
                  color: p.ready ? "#22c55e" : "#ef4444",
                }}
              >
                {p.ready ? "READY" : "NOT READY"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={toggleReady}
        style={{
          ...styles.readyButton,
          backgroundColor: ready ? "#ef4444" : "#3b82f6",
        }}
      >
        {ready ? "UNREADY" : "READY"}
      </button>
    </div>
  );
}

// الستايلات (styles) تبقى كما هي في كودك الأصلي دون تغيير
const styles = {
  page: { height: "100vh", width: "100vw", padding: 20, background: "linear-gradient(135deg,#1e293b,#0f172a,#1e40af)", color: "white", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", fontFamily: "Arial, sans-serif" },
  username: { position: "absolute", top: 20, left: 20, fontSize: 18, fontWeight: "bold", opacity: 0.9 },
  title: { marginTop: 60, fontSize: 36, fontWeight: "bold", textAlign: "center" },
  countdown: { fontSize: 70, marginTop: 20 },
  playersBox: { width: "70%", marginTop: 30, display: "flex", flexDirection: "column", gap: 15 },
  playerCard: { background: "rgba(255,255,255,0.1)", padding: 15, borderRadius: 12, display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.2)" },
  playerNumber: { fontSize: 22, marginRight: 15, color: "#38bdf8", fontWeight: "bold" },
  playerInfo: { display: "flex", flexDirection: "column" },
  playerName: { fontSize: 20, fontWeight: "bold" },
  status: { fontSize: 16, marginTop: 5, fontWeight: "bold" },











  
  readyButton: { marginTop: 40, padding: "15px 40px", fontSize: 22, borderRadius: 12, border: "none", cursor: "pointer", fontWeight: "bold" },
};