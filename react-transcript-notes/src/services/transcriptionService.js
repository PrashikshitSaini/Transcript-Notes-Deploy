import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const transcribeAudio = async (audioFile) => {
  if (!audioFile || !(audioFile instanceof File)) {
    throw new Error("A valid audio file is required");
  }

  if (audioFile.name === "recording.wav") {
    return (
      window.recordedTranscript ||
      "No transcript was recorded. Please try recording again."
    );
  }

  try {
    const formData = new FormData();
    formData.append("audio", audioFile);

    console.log("Sending audio file to server for Vosk transcription...");

    const response = await axios.post(`${API_URL}/upload-audio`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 120000,
    });

    if (response.data && response.data.transcript) {
      console.log("Transcription received from server");
      return response.data.transcript;
    }
    throw new Error("No transcript returned from server");
  } catch (error) {
    console.error("Error transcribing audio:", error);
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Transcription timed out. The file may be too large or the server is busy."
      );
    } else if (error.response) {
      throw new Error(
        `Server error: ${
          error.response.data.error || error.response.statusText
        }`
      );
    } else if (error.request) {
      throw new Error(
        "Server not responding. Make sure the server is running."
      );
    } else {
      throw new Error(`Transcription error: ${error.message}`);
    }
  }
};

export const setupLiveTranscription = () => {
  window.recordedTranscript = "";
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return {
      supported: false,
      error: "Speech recognition not supported in this browser",
    };
  }

  // Create a new instance each time to avoid any state issues
  const recognition = new SpeechRecognition();

  // Configure recognition settings
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  // Required for Chrome - increase recognition time
  recognition.interimResults = true;

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
  };

  recognition.onstart = () => {
    console.log("Speech recognition started - listening for speech");
  };

  recognition.onresult = (event) => {
    console.log("Speech recognition result received");

    // Simple, robust implementation
    let interimTranscript = "";
    let finalTranscript = window.recordedTranscript || "";

    // Process all results from the current recognition session
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        console.log("Final transcript:", transcript);
        finalTranscript += transcript + " ";
      } else {
        console.log("Interim transcript:", transcript);
        interimTranscript = transcript;
      }
    }

    // Always update the global variable
    window.recordedTranscript = finalTranscript;

    // Update the UI
    if (window.onInterimTranscript) {
      window.onInterimTranscript(interimTranscript);
    }
  };

  return {
    supported: true,
    recognition,
  };
};
