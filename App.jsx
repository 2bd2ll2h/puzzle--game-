





import React, { useState, useRef, useEffect } from "react";
import WaitingRoom from "./WaitingRoom";
import Admin from "./Admin";
import { socket } from "./socket";

export default function App() {
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [wrongPass, setWrongPass] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const bgRef = useRef(new Audio("/sounds/bg.mp3"));
  const joinSound = useRef(new Audio("/sounds/join.mp3"));

  useEffect(() => {
    const bg = bgRef.current;
    bg.loop = true;
    bg.volume = 0.35;
  }, []);

  useEffect(() => {
    const bg = bgRef.current;
    if (joined) {
      bg.play().catch(() => {});
    } else {
      bg.pause();
      bg.currentTime = 0;
    }
    return () => {
      bg.pause();
      bg.currentTime = 0;
    };
  }, [joined]);

  const handleJoin = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    joinSound.current.play().catch(() => {});
    setName(trimmed);
    setJoined(true);
  };

  const openAdmin = () => {
    setShowAdminLogin(true);
    setAdminPass("");
    setWrongPass(false);
    setShowPass(false);
  };




  
  const handleAdminLogin = () => {
    if (adminPass === "admin1234") {
      setWrongPass(false);
      setIsAdmin(true);
      setShowAdminLogin(false);
    } else {
      setWrongPass(true);
    }
  };

  if (isAdmin) {
    return <Admin logout={() => setIsAdmin(false)} />;
  }

  if (showAdminLogin) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 className="title">تسجيل دخول الأدمن</h2>

          <div style={{ position: "relative", width: "100%", marginTop: 10 }}>
            <input
              type={showPass ? "text" : "password"}
              placeholder="كلمة السر..."
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              style={styles.input}
            />
            <span
              onClick={() => setShowPass(!showPass)}
              style={styles.eyeIcon}
            >
              👁
            </span>
          </div>

          {wrongPass && (
            <p style={styles.errorBox}>❌ كلمة السر غلط</p>
          )}

          <button onClick={handleAdminLogin} style={styles.button}>
            دخول
          </button>

          <button
            onClick={() => setShowAdminLogin(false)}
            style={styles.backButton}
          >
            يعود
          </button>
        </div>

        <div
          style={styles.settingsCorner}
          onClick={() => setShowAdminLogin(false)}
        >
          ⚙️ إعدادات
        </div>
      </div>
    );
  }

  return (
    <>
      {!joined ? (
        <div style={styles.container}>
          <div style={styles.settingsCorner} onClick={openAdmin}>
            ⚙️ إعدادات
          </div>

          <div style={styles.card}>
            <h1 className="title">Welcome to El Mommias</h1>
            <h2 style={styles.subtitle}>أهلاً بالمميزين 👋</h2>

            <form onSubmit={handleJoin}>
              <input
                type="text"
                placeholder="اكتب اسمك هنا..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.button}>
                دخول اللعبة
              </button>
            </form>
          </div>
        </div>
      ) : (
        <WaitingRoom name={name} bgRef={bgRef} />
      )}

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0);}
          25%{transform:translateX(-5px);}
          50%{transform:translateX(5px);}
          75%{transform:translateX(-5px);}
        }

        @keyframes gradientBG {
          0% {background-position:0% 50%;}
          50% {background-position:100% 50%;}
          100% {background-position:0% 50%;}
        }

        @keyframes glowTitle {
          0% { text-shadow: 0 0 10px rgba(255,122,0,0.5);}
          50% { text-shadow: 0 0 30px rgba(255,122,0,1);}
          100% { text-shadow: 0 0 10px rgba(255,122,0,0.5);}
        }

        .title {
          color: #ff7a00;
          font-size: 36px;
          margin-bottom: 10px;
          animation: shake 0.8s ease infinite, glowTitle 2s ease infinite;
        }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
    overflow: "hidden",
    background: "linear-gradient(-45deg,#ff7a00,#ff9e3d,#ffb74d,#ff7a00)",
    backgroundSize: "400% 400%",
    animation: "gradientBG 15s ease infinite",
  },

  settingsCorner: {
    position: "absolute",
    top: 18,
    left: 18,
    background: "#ff7a00",
    color: "white",
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    fontWeight: "bold",
    zIndex: 30,
  },

  card: {
    background: "white",
    padding: "40px",
    borderRadius: "20px",
    width: "90%",
    maxWidth: "400px",
    textAlign: "center",
    boxShadow: "0px 4px 25px rgba(0,0,0,0.25)",
  },

  subtitle: {
    color: "#333",
    marginBottom: "25px",
    fontSize: "20px",
    opacity: 0.9,
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    fontSize: "16px",
  },

  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    background: "#ff7a00",
    color: "white",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
  },

  backButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    background: "#fff",
    color: "#333",
    border: "1px solid #ddd",
    marginTop: 10,
    cursor: "pointer",
  },

  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 10,
    cursor: "pointer",
  },

  errorBox: {
    color: "white",
    background: "#ef4444",
    padding: "8px",
    borderRadius: 8,
    marginTop: 8,
  },





};









