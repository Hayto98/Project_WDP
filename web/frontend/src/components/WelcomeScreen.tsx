import { useState, useEffect } from "react";
import "./WelcomeScreen.css";

export function WelcomeScreen({ onEnter }: { onEnter: () => void }) {
  const [fade, setFade] = useState(false);
  const [hidden, setHidden] = useState(false);

  const handleEnter = () => {
    setFade(true);
    setTimeout(() => {
      setHidden(true);
      onEnter();
    }, 1200); // 1.2s fade out time
  };

  useEffect(() => {
    // Automatically transition to the home page after 2.5 seconds
    const timer = setTimeout(() => {
      handleEnter();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (hidden) return null;

  return (
    <div className={`welcome-screen ${fade ? "welcome-screen--fade" : ""}`}>
      <div className="welcome-content">
        <h1 className="welcome-title">
          <span className="welcome-word">Chào mừng đến với</span>
          <br />
          <span className="welcome-word welcome-highlight">ResearchTrends</span>
        </h1>
        <p className="welcome-subtitle">
          Khám phá không gian dữ liệu học thuật, phát hiện xu hướng và định hình tương lai nghiên cứu.
        </p>
      </div>
    </div>
  );
}
