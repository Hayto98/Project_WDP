import { useState, useEffect } from "react";
import "./LoadingScreen.css";

export function LoadingScreen({ onLoaded }: { onLoaded: () => void }) {
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      // Simulate fast but uneven loading for dramatic effect
      current += Math.random() * 8 + 2;
      if (current >= 100) {
        current = 100;
        setProgress(100);
        clearInterval(interval);
        
        setTimeout(() => setFade(true), 800); // Wait at 100% for a bit
        setTimeout(() => {
          setHidden(true);
          onLoaded();
        }, 2000); // Trigger transition to WelcomeScreen
      } else {
        setProgress(current);
      }
    }, 120);
    
    return () => clearInterval(interval);
  }, [onLoaded]);

  if (hidden) return null;

  return (
    <div className={`loading-screen ${fade ? "loading-screen--fade" : ""}`}>
      <div className="loading-content">
        <div className="spinner">
           <div className="spinner-ring" />
           <div className="spinner-core" />
        </div>
        <div className="loading-text-container">
          <span className="loading-kicker">SYSTEM BOOT</span>
          <h2 className="loading-title">ResearchTrends Observatory</h2>
          <p className="loading-status">
            {progress < 100 ? "Đang nạp 1.28M metadata và phân tích xu hướng..." : "Khởi tạo không gian dữ liệu hoàn tất."}
          </p>
          
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-num">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
