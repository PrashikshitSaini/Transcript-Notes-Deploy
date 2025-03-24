import React, { useState, useEffect } from "react";

const Timer = ({ isRecording, isPaused, startTime }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval = null;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        const currentTime = Date.now();
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused, startTime]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  let timerDisplay = "Not recording";

  if (isRecording && isPaused) {
    timerDisplay = `Recording paused at ${formatTime(elapsedTime)}`;
  } else if (isRecording) {
    timerDisplay = `Recording Time: ${formatTime(elapsedTime)}`;
  } else if (elapsedTime > 0) {
    timerDisplay = `Recording stopped at ${formatTime(elapsedTime)}`;
  }

  return <div className="timer">{timerDisplay}</div>;
};

export default Timer;
