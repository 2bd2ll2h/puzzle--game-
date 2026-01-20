// src/Admin.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { socket } from "./socket";

export default function Admin({ logout }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [duration, setDuration] = useState(3);
  const [answer, setAnswer] = useState("");
  const [savedList, setSavedList] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

























  



  useEffect(() => {
    fetchList();
    socket.on("adminError", (p) => {
      alert(p?.msg || "مش كل اللاعبين مستعدين");
    });
    return () => socket.off("adminError");
  }, []);

  const fetchList = async () => {








    try {
      const r = await axios.get       ("https://asset-manager--bdallahashrf110.replit.app/images");
      setSavedList(r.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const onChoose = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const doUpload = async () => {
    if (!file) return alert("اختار صورة أولاً");
  




































    



    






  if (!answer.trim())
    return alert("لازم تكتب إجابة للصورة قبل الحفظ");

  setSaving(true);
    try {
      const fd = new FormData();
      fd.append("image", file);








      












      






      


const r = await axios.post("https://asset-manager--bdallahashrf110.replit.app/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 20000,
      });
      const { filename, originalname } = r.data || {};
      if (!filename) throw new Error("Upload returned no filename");
      await axios.post(
   "https://asset-manager--bdallahashrf110.replit.app/save-image",














        { filename, originalname, duration, answer },
        { timeout: 10000 }
      );
      await fetchList();
      setFile(null);
      setPreviewUrl(null);







      
      setAnswer("");
      if (fileRef.current) fileRef.current.value = "";
      alert("Image saved");                    






    } catch (e) {
      console.error("Upload error:", e);
      if (e.message && e.message.includes("Network Error")) {
        alert(
          "Upload error: Network Error — تأكد من تشغيل السيرفر على  https://asset-manager--bdallahashrf110.replit.app              وأنه يسمح بالـ CORS."
        );
      } else {
        alert(
          "Upload error: " +
            (e.response?.data?.error || e.message || "Unknown")
        );
      }
    }
    setSaving(false);
  };








  














  const handleStart = () => {
    socket.emit("adminTriggerStart");
  };

  return (
    <div style={styles.full}>
      <div style={styles.centerBox}>
        <h2 style={{ marginBottom: 10 }}>صفحة الأدمن</h2>

        <div style={styles.bigBox}>
          <div style={styles.previewBox}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div style={{ color: "#777" }}>معاينة الصورة هنا</div>
            )}
          </div>

          <div style={styles.controls}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onChoose}
              style={{ marginBottom: 10 }}
            />

            <div style={{ marginBottom: 10 }}>
              مدة الصورة:
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ marginLeft: 8 }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>

            <div style={{ marginBottom: 10 }}>
              إجابة الصورة (answer):
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="الإجابة الصحيحة..."
                style={{ marginLeft: 8, padding: "6px", width: "60%" }}
              />
            </div>

            <button
              onClick={doUpload}
              disabled={saving}
              style={styles.orangeBtn}
            >
              {saving ? "جارٍ الحفظ..." : "حفظ الصورة"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={handleStart} style={styles.orangeBtn}>
            بدء اللعبة (من الأدمن)
          </button>
          <button onClick={logout} style={styles.backBtn}>
            خروج
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <h4>قائمة الصور المحفوظة</h4>
          <ul>
            {savedList.map((s, i) => (
              <li key={i}>
                {s.originalname} — duration: {s.duration} — answer: {s.answer}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  full: {
    height: "100vh",
    width: "100vw",
    background:
      "linear-gradient(-45deg, #ff7a00, #ff9e3d, #ffb74d, #ff7a00)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Arial, sans-serif",
  },
  centerBox: {
    width: "90%",
    maxWidth: 1000,
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
  },



  
  bigBox: { display: "flex", gap: 20, alignItems: "center" },
  previewBox: {
    width: 520,
    height: 360,
    background: "#fafafa",
    border: "1px dashed #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  controls: { flex: 1 },
  orangeBtn: {
    background: "#ff7a00",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
    marginRight: 8,
  },










  backBtn: {
    background: "#fff",
    color: "#333",
    border: "1px solid #ddd",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
    marginLeft: 8,
  },
};

















