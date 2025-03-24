import React, { useState } from "react";
import RecordingControls from "./components/RecordingControls";
import Timer from "./components/Timer";
import NotesDisplay from "./components/NotesDisplay";
import "./App.css";

function App() {
  const [notes, setNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState(null);

  const handleNotesGenerated = (generatedNotes) => {
    setNotes(generatedNotes);
  };

  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingStartTime(Date.now());
  };

  const pauseRecording = () => {
    setIsPaused(true);
  };

  const resumeRecording = () => {
    setIsPaused(false);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Transcript & Notes App</h1>
      </header>
      <main>
        <RecordingControls
          isRecording={isRecording}
          isPaused={isPaused}
          onStartRecording={startRecording}
          onPauseRecording={pauseRecording}
          onResumeRecording={resumeRecording}
          onStopRecording={stopRecording}
          onNotesGenerated={handleNotesGenerated}
        />

        <Timer
          isRecording={isRecording}
          isPaused={isPaused}
          startTime={recordingStartTime}
        />

        <NotesDisplay notes={notes} />
      </main>
    </div>
  );
}

export default App;
