import React, { useRef, useState, useEffect } from "react";
import {
  transcribeAudio,
  setupLiveTranscription,
} from "../services/transcriptionService";
import { generateNotes } from "../services/notesGenerationService";
import AudioVisualizer from "./AudioVisualizer";

const RecordingControls = ({
  isRecording,
  isPaused,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onNotesGenerated,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recognitionStatus, setRecognitionStatus] = useState("Not started");
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);

  // Function to process recorded audio and generate notes
  const processRecordedAudio = async (audioBlob) => {
    try {
      setIsProcessing(true);

      // Convert blob to file for consistency with the API
      const audioFile = new File([audioBlob], "recording.wav", {
        type: "audio/wav",
      });

      // FIXED: Make sure we have a transcript, possibly from either source
      let transcript = window.recordedTranscript || "";

      // If we still don't have a transcript, try to get it one more time
      if (!transcript || transcript.trim() === "") {
        console.warn(
          "No transcript captured during recording, trying fallback method"
        );
        try {
          // Try server-side transcription as fallback
          transcript = await transcribeAudio(audioFile);
        } catch (e) {
          transcript =
            "No speech detected. Please try again and speak clearly into the microphone.";
        }
      }

      // Generate notes
      const notes = await generateNotes(transcript);
      onNotesGenerated(notes);
    } catch (error) {
      console.error("Error processing recording:", error);
      onNotesGenerated("Error processing recording: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Setup Web Speech API live transcription with enhanced error handling
  useEffect(() => {
    console.log("Setting up Speech Recognition...");
    // First check if browser supports SpeechRecognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech Recognition API not supported in this browser");
      setRecognitionStatus("API not supported");
      setIsMicSupported(false);
      return;
    }

    // Create a new recognition instance directly here for better control
    const recognition = new SpeechRecognition();

    // Configure recognition with optimal settings
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

    // Set up event handlers with detailed logging
    recognition.onstart = () => {
      console.log("Speech recognition started successfully");
      setRecognitionStatus("Listening");
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error, event);
      setRecognitionStatus(`Error: ${event.error}`);

      // Handle specific error cases
      if (event.error === "no-speech") {
        console.log(
          "No speech detected. Make sure your microphone is working."
        );
      } else if (event.error === "audio-capture") {
        console.error("Audio capture failed. Check microphone permissions.");
        setIsMicSupported(false);
      } else if (event.error === "not-allowed") {
        console.error("Microphone permission denied by user or system");
        setIsMicSupported(false);
      }
    };

    recognition.onend = () => {
      console.log("Speech recognition ended");
      setRecognitionStatus("Ended");

      if (window.shouldRestartRecognition) {
        console.log("Attempting to restart recognition...");
        setTimeout(() => {
          try {
            if (window.shouldRestartRecognition) {
              recognition.start();
              console.log("Recognition restarted successfully");
              setRecognitionStatus("Restarted");
            }
          } catch (e) {
            console.error("Error restarting recognition:", e);
            setRecognitionStatus(`Restart failed: ${e.message}`);
          }
        }, 300);
      }
    };

    recognition.onresult = (event) => {
      console.log("Speech recognition result received", event);

      // Process the results
      let interimText = "";
      let finalText = window.recordedTranscript || "";

      // Process all results from the current recognition session
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          console.log("Final transcript:", transcript);
          finalText += transcript + " ";
          setRecognitionStatus("Transcribed");
        } else {
          console.log("Interim transcript:", transcript);
          interimText = transcript;
        }
      }

      // Update the state and global variable
      window.recordedTranscript = finalText;
      setInterimTranscript(interimText);
    };

    // Store the recognition instance
    recognitionRef.current = recognition;

    window.onInterimTranscript = (text) => {
      setInterimTranscript(text);
    };

    // Check media support with detailed diagnostics
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log("Microphone access granted successfully", stream);
        setRecognitionStatus("Mic OK");

        // Check audio tracks
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          console.log("Audio tracks found:", audioTracks.length);
          console.log("Audio track settings:", audioTracks[0].getSettings());
          console.log(
            "Audio track constraints:",
            audioTracks[0].getConstraints()
          );
        }

        // Stop the stream immediately after testing
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("Microphone access error:", err);
        setRecognitionStatus(`Mic error: ${err.name}`);
        setIsMicSupported(false);
      }
    })();

    return () => {
      window.onInterimTranscript = null;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          console.log("Recognition stopped during cleanup");
        } catch (e) {
          // Ignore errors on stop - it might not be running
        }
      }
    };
  }, []);

  // Control live speech recognition based on recording state with improved timing
  useEffect(() => {
    if (!recognitionRef.current) {
      console.log("Recognition not initialized");
      return;
    }

    if (isRecording && !isPaused) {
      // Stop any existing recognition first
      try {
        recognitionRef.current.stop();
        console.log("Stopped existing recognition before starting new session");
      } catch (e) {
        // Ignore errors on stop - it might not be running
        console.log("No existing recognition to stop or error stopping:", e);
      }

      // Clear any existing transcript
      window.recordedTranscript = "";
      window.shouldRestartRecognition = true;
      setInterimTranscript("");

      // Give browser a moment to clean up previous instance
      setTimeout(() => {
        try {
          console.log("Starting speech recognition...");
          recognitionRef.current.start();
          setRecognitionStatus("Started");
        } catch (e) {
          console.error("Error starting recognition:", e);
          setRecognitionStatus(`Start error: ${e.message}`);

          // If recognition fails to start, create a fresh instance
          console.log("Creating new recognition instance");

          // Create a new recognition instance with the same settings
          const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
          const newRecognition = new SpeechRecognition();
          newRecognition.continuous = true;
          newRecognition.interimResults = true;
          newRecognition.maxAlternatives = 1;
          newRecognition.lang = "en-US";

          // Copy all event handlers
          newRecognition.onstart = recognitionRef.current.onstart;
          newRecognition.onerror = recognitionRef.current.onerror;
          newRecognition.onend = recognitionRef.current.onend;
          newRecognition.onresult = recognitionRef.current.onresult;

          recognitionRef.current = newRecognition;

          // Try to start the new instance
          try {
            recognitionRef.current.start();
            setRecognitionStatus("Reinitialized");
          } catch (startErr) {
            console.error("Still couldn't start recognition:", startErr);
            setRecognitionStatus(`Failed: ${startErr.message}`);
          }
        }
      }, 500);
    } else if (recognitionRef.current) {
      // Make sure to stop recognition when not recording
      window.shouldRestartRecognition = false;
      try {
        recognitionRef.current.stop();
        setRecognitionStatus("Stopped");
      } catch (e) {
        // Ignore errors on stop - it might not be running
        console.log("Error stopping recognition:", e);
      }
    }
  }, [isRecording, isPaused]);

  // Improved: Setup media recorder for file capture
  const setupMediaRecorder = async () => {
    if (mediaStreamRef.current) {
      // If we have an existing stream, stop all tracks
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Store the stream for later cleanup
      mediaStreamRef.current = stream;

      // Create the media recorder with the stream
      const recorder = new MediaRecorder(stream);

      // Reset audio chunks array
      audioChunksRef.current = [];

      // Set up event handlers
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/wav",
          });
          processRecordedAudio(audioBlob);
        } else {
          console.warn("No audio data collected during recording");
          onNotesGenerated("No audio data was recorded. Please try again.");
        }
      };

      return recorder;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsMicSupported(false);
      throw error;
    }
  };

  // Modified: Handle standard recording with 30 minute automatic stop
  const handleRecording = async () => {
    if (isRecording) return;

    try {
      // Clear existing transcript
      window.recordedTranscript = "";
      setInterimTranscript("");
      setRecognitionStatus("Starting...");

      // Set up media recorder
      mediaRecorderRef.current = await setupMediaRecorder();

      // Start recording
      onStartRecording();
      window.shouldRestartRecognition = true;
      mediaRecorderRef.current.start(60000); // Get data every minute for safety

      console.log(
        "Started recording - will automatically stop after 30 minutes"
      );

      // Automatically stop after 30 minutes
      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !== "inactive"
        ) {
          console.log("Automatically stopping recording after 30 minutes");
          window.shouldRestartRecognition = false;
          onStopRecording();
          mediaRecorderRef.current.stop();

          // Cleanup stream
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          }
        }
      }, 30 * 60 * 1000); // 30 minutes
    } catch (error) {
      console.error("Failed to start recording:", error);
      setRecognitionStatus(`Start failed: ${error.message}`);
      alert(
        "Could not access microphone. Please check your browser permissions."
      );
    }
  };

  // Pause/resume control for media recorder
  useEffect(() => {
    if (mediaRecorderRef.current) {
      if (isRecording) {
        if (isPaused && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.pause();
        } else if (!isPaused && mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.resume();
        }
      }
    }
  }, [isPaused, isRecording]);

  // Clean up media resources when recording stops
  useEffect(() => {
    if (!isRecording && mediaStreamRef.current) {
      // Small delay to ensure processing completes before cleanup
      const cleanupTimeout = setTimeout(() => {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }, 1000);

      return () => clearTimeout(cleanupTimeout);
    }
  }, [isRecording]);

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsProcessing(true);
        onNotesGenerated("Processing your audio file... Please wait.");
        const transcript = await transcribeAudio(file);
        const notes = await generateNotes(transcript);
        onNotesGenerated(notes);
      } catch (error) {
        console.error("Error processing file:", error);
        onNotesGenerated("Error processing file: " + error.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="recording-controls">
      <div className="debug-info">
        {isMicSupported ? (
          <>
            <div className="sound-wave-container">
              <AudioVisualizer isRecording={isRecording} isPaused={isPaused} />
              <div>
                Status:{" "}
                {isRecording ? (isPaused ? "Paused" : "Recording") : "Ready"} |
                Recognition: {recognitionStatus}
              </div>
            </div>
            {isRecording && (
              <div className="interim-transcript">
                {isPaused ? (
                  <em>Recording paused</em>
                ) : (
                  <em>
                    Heard: {interimTranscript || "[Waiting for speech...]"}
                  </em>
                )}
              </div>
            )}
            <label className="file-label" tabIndex="0" role="button">
              Select Audio File
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="audio/wav,audio/mp3,audio/m4a"
                className="file-input"
                disabled={isRecording || isProcessing}
              />
            </label>
            <div className="recording-info">
              <em>Recording will automatically stop after 30 minutes</em>
            </div>
          </>
        ) : (
          <div>
            <AudioVisualizer isRecording={isRecording} isPaused={isPaused} />
            <div className="sound-wave-placeholder">
              Microphone access not available in this browser. Please use the
              file upload option.
            </div>
          </div>
        )}
      </div>
      <div className="button-group">
        <button
          onClick={handleRecording}
          disabled={isRecording || isProcessing || !isMicSupported}
        >
          Start Recording
        </button>
        <button
          onClick={onPauseRecording}
          disabled={!isRecording || isPaused || isProcessing}
        >
          Pause Recording
        </button>
        <button
          onClick={onResumeRecording}
          disabled={!isRecording || !isPaused || isProcessing}
        >
          Resume Recording
        </button>
        <button
          onClick={() => {
            window.shouldRestartRecognition = false;
            onStopRecording();
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state !== "inactive"
            ) {
              mediaRecorderRef.current.stop();
            }
          }}
          disabled={!isRecording || isProcessing}
        >
          Stop Recording
        </button>
      </div>
      {isProcessing && <p className="processing-indicator">Processing</p>}
    </div>
  );
};

export default RecordingControls;
