 import { useEffect, useRef, useState } from "react";

import { io } from "socket.io-client";



const encouragementNames = [

  "أسطوري", "خارق", "مميز", "مذهل", "رائع", "فريد", "لا يُقهر",

  "ممتاز", "رائع جدًا", "فائق", "مبهر", "مذهل", "متألق",

  "ممتاز جدًا", "لا يُضاهى", "بطل", "ممتاز للغاية",

  "متفوق", "خارق", "مذهل جدًا", "عبقري", "أسطوري جدًا"

];









































































































// بدلاً من io("http://localhost:3001")

const socket = io("https://asset-manager--bdallahashrf110.replit.app");



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





// أضف هذا الـ State مع البداية

const [isFinished, setIsFinished] = useState(false);







  const timerRef = useRef(null);



  const readySound = useRef(new Audio("/sounds/ready.mp3"));

  const unreadySound = useRef(new Audio("/sounds/unready.mp3"));

  const audioCtx = useRef(null);



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









    socket.emit("join", playerName);










































    
















    











    





    // استقبال تحديثات السكور

    socket.on("updateScores", (data) => {

        // إذا اللاعب أنهى اللعبة، نغلق باب التحديث التلقائي تماماً لضمان الثبات

        if (isFinished) {

            console.log("تم حجب تحديث تلقائي للحفاظ على ثبات واجهتك");

            return; 

        }









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

        socket.off("updateScores");

        socket.off("globalSkipEnable");

      













    }     ;

}, [index, showResults, finalResults, showEncouragement, isFinished]);















useEffect(() => {

    // إذا اللاعب أنهى اللعبة، لا تشغل تايمر ولا تصدر أصواتاً

    if (!img || isFinished) return; 



    setAnswer("");

    setStatus("neutral");

    setTime(img.duration * 60);

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

            // التأكد أن الصوت لا يعمل إلا إذا كان اللاعب لا يزال داخل السؤال

            if (t <= 3 && !isFinished) playTick(); 

            return t - 1;

        });

    }, 1000);



    return () => {

        if (timerRef.current) clearInterval(timerRef.current);

    };

}, [index, img, isFinished]); // أضفنا isFinished هنا كمراقب















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

    // 1. إيقاف التايمر فوراً

    if (timerRef.current) clearInterval(timerRef.current);

    

    socket.emit("requestScores");

    setSkipAvailable(false);

    

    // التحقق هل وصلنا لآخر صورة

    if (index + 1 >= imgs.length) {

        setIsFinished(true); // تفعيل القفل: لا تحديثات تلقائية بعد الآن

        

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

    // طلب تحديث لحظي من السيرفر

    socket.emit("requestScores");

    

    // الاستماع لرد واحد فقط (مرة واحدة) وتحديث الشاشة

    socket.once("updateScores", (data) => {

        setScores(data.scores);

        console.log("تم التحديث اليدوي بنجاح!");

    });

};





 





  if (!imgs.length) return <div style={{ color: "white" }}>في انتظار بدء اللعبة...</div>;



  if (showEncouragement) {

    return (

      <div style={styles.page}>

        <div style={styles.resultsCard}>

          <button style={styles.next} onClick={() => { setShowEncouragement(false); setFinalResults(true); setShowResults(true); }}>Skip</button>

          <h3>🎉 Congratulations to the Winner!</h3>

          <h2 style={{ marginBottom: 20 }}>{playerName} — {scores.find(p=>p.name===playerName)?.score || 0} ⭐</h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#0f172a" }}>

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

        <div style={styles.resultsCard}>

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

            <>

              <button onClick={refreshScores} style={{padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none'}}>🔄 Refresh</button>

              <p>مع تحيات الادمن المميز مميز جدا</p>

              <p>والمبدعة زلطه</p>

              <p>خالص تحياتي لكم العضو المبجل عبدو</p>

            </>

          )}

        </div>

      </div>

    );

  }



  return (

    <div style={styles.page}>

      <div style={styles.card}>

        <div style={styles.imageBox}>

          <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />

        </div>

        <div style={styles.side}>

          <div style={styles.timer}>⏰ {formatTime(time)}</div>

          <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="اكتب الإجابة..." style={{ ...styles.input, background: status === "correct" ? "#22c55e" : status === "wrong" ? "#ef4444" : "#fff", color: status === "neutral" ? "#000" : "#fff" }} />

          <button onClick={submit} style={styles.submit}>Submit</button>

          {skipAvailable && (<button onClick={skip} style={styles.next}>Skip</button>)}

        </div>

      </div>

    </div>

  );

}



const styles = {

  page: { height: "100vh", width: "100vw", background: "linear-gradient(135deg,#0f172a,#020617)", display: "flex", justifyContent: "center", alignItems: "center" },

  card: { width: "90%", height: "85%", background: "#fff", borderRadius: 16, display: "flex", gap: 30, padding: 24, boxShadow: "0 10px 40px rgba(0,0,0,.4)" },

  imageBox: { flex: 3, background: "#f3f3f3", borderRadius: 12, display: "flex", justifyContent: "center", alignItems: "center" },

  side: { flex: 1, display: "flex", flexDirection: "column", gap: 14, justifyContent: "center" },

  timer: { fontSize: 32, fontWeight: "bold", textAlign: "center" },

  input: { padding: 14, borderRadius: 10, border: "1px solid #ccc", fontSize: 18 },

  submit: { padding: 14, background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" },

  next: { padding: 14, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" },

  resultsCard: { width: "70%", minHeight: "60%", background: "#fff", borderRadius: 16, padding: 24, position: "relative", display: "flex", flexDirection: "column", alignItems: "center" },

  arrow: { position: "absolute", top: 14, right: 20, fontSize: 28, cursor: "pointer" },



































  








  






  

  scoreItem: { listStyle: "none", padding: 12, marginBottom: 10, background: "#f1f5f9", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 18, width: '100%' },

};

