const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { spawn } = require("child_process");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Check for Vosk model
const modelPath = path.join(__dirname, "vosk-model-small-en-us-0.15");
if (fs.existsSync(modelPath)) {
  console.log("✅ Vosk model found");
} else {
  console.log("⚠️ Vosk model not found - transcription will fail");
}

// Audio transcription with Vosk using Node.js child process
app.post("/api/upload-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    console.log(`Audio file received: ${req.file.originalname}`);
    const filePath = req.file.path;

    // Create a simple JavaScript wrapper for Vosk transcription
    const voskScript = path.join(__dirname, "vosk-transcribe.js");

    // Create the script if it doesn't exist
    if (!fs.existsSync(voskScript)) {
      const scriptContent = `
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// Usage: node vosk-transcribe.js [audiofile]
const audioFile = process.argv[2];

if (!audioFile) {
  console.error('Please provide an audio file path');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(audioFile)) {
  console.error('Audio file not found:', audioFile);
  process.exit(1);
}

// First convert to the right format using ffmpeg
const tempWavFile = audioFile + '.wav';

const ffmpeg = spawn('ffmpeg', [
  '-i', audioFile,
  '-ar', '16000',
  '-ac', '1',
  '-f', 'wav',
  tempWavFile
]);

let ffmpegError = '';

ffmpeg.stderr.on('data', (data) => {
  ffmpegError += data.toString();
});

ffmpeg.on('close', (code) => {
  if (code !== 0) {
    console.error('FFmpeg conversion failed:', ffmpegError);
    process.exit(1);
  }
  
  // Once converted, use vosk-transcriber.py script
  const vosk = spawn('python', [
    path.join(__dirname, 'vosk-transcriber.py'),
    tempWavFile
  ]);
  
  let transcript = '';
  let error = '';
  
  vosk.stdout.on('data', (data) => {
    transcript += data.toString();
  });
  
  vosk.stderr.on('data', (data) => {
    error += data.toString();
  });
  
  vosk.on('close', (code) => {
    // Clean up temp file
    if (fs.existsSync(tempWavFile)) {
      fs.unlinkSync(tempWavFile);
    }
    
    if (code !== 0) {
      console.error('Vosk transcription failed:', error);
      process.exit(1);
    }
    
    // Output transcript to stdout
    console.log(transcript);
  });
});
`;
      fs.writeFileSync(voskScript, scriptContent);
    }

    // Create the Python transcriber if it doesn't exist
    const pythonScript = path.join(__dirname, "vosk-transcriber.py");
    if (!fs.existsSync(pythonScript)) {
      const pythonContent = `
import sys
import os
import json
import wave
import vosk

def transcribe_audio(audio_file):
    """Transcribe WAV file using Vosk"""
    
    # Check if audio file exists
    if not os.path.exists(audio_file):
        print(f"File not found: {audio_file}")
        return ""
    
    # Check for Vosk model
    model_path = os.path.join(os.path.dirname(__file__), "vosk-model-small-en-us-0.15")
    if not os.path.exists(model_path):
        print(f"Vosk model not found: {model_path}")
        return "Error: Vosk model not found"
    
    try:
        # Load model
        model = vosk.Model(model_path)
        
        # Open audio file
        wf = wave.open(audio_file, "rb")
        
        # Validate format
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
            print("Audio must be WAV format mono PCM")
            return "Error: Incorrect audio format. Must be WAV mono."
        
        # Create recognizer
        rec = vosk.KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)
        
        # Process audio
        results = []
        
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            
            if rec.AcceptWaveform(data):
                part_result = json.loads(rec.Result())
                if "text" in part_result and part_result["text"].strip():
                    results.append(part_result["text"])
        
        # Get final chunks
        part_result = json.loads(rec.FinalResult())
        if "text" in part_result and part_result["text"].strip():
            results.append(part_result["text"])
        
        # Join all parts
        return " ".join(results)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return f"Error transcribing: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python vosk-transcriber.py <audio_file>")
        sys.exit(1)
    
    # Perform transcription
    audio_file = sys.argv[1]
    transcript = transcribe_audio(audio_file)
    print(transcript)
`;
      fs.writeFileSync(pythonScript, pythonContent);
    }

    // Execute the transcription script
    console.log("Starting background transcription...");

    // Use the wrapper script to handle conversion and transcription
    const transcription = await new Promise((resolve, reject) => {
      const process = spawn("node", [voskScript, filePath]);

      let output = "";
      let errorOutput = "";

      process.stdout.on("data", (data) => {
        output += data.toString();
      });

      process.stderr.on("data", (data) => {
        errorOutput += data.toString();
        console.error(`Transcription error: ${data}`);
      });

      process.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Transcription process failed with code ${code}: ${errorOutput}`
            )
          );
        } else {
          resolve(output.trim() || "No speech detected in the audio.");
        }
      });

      process.on("error", (err) => {
        reject(
          new Error(`Failed to start transcription process: ${err.message}`)
        );
      });
    });

    console.log("Transcription completed");

    // Return the transcript to the client
    res.json({ transcript: transcription });

    // Clean up the original file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Error removing temp file:", err);
    }
  } catch (error) {
    console.error("Error processing audio:", error);
    res.status(500).json({
      error: "Error processing audio file",
      message: error.message,
      transcript: "Failed to transcribe audio due to a server error.",
    });

    // Clean up if there was an error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
});

// API endpoint for generating notes with Gemini API
app.post("/api/generate-notes", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: "No transcript provided" });
    }

    const GEMINI_API_KEY = process.env.API_KEY;

    if (!GEMINI_API_KEY) {
      return res
        .status(500)
        .json({ error: "API_KEY is not configured on the server" });
    }

    console.log("Generating notes with Gemini API...");

    // Generate notes with Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Generate comprehensive, well-organized notes from this transcript. 
                Format the response in proper Markdown syntax with:
                - Headers and subheaders (# and ##) for main topics and subtopics
                - Bullet points (- or *) for lists
                - **Bold** for important terms or concepts
                - *Italics* for emphasis
                - > Blockquotes for significant quotes or statements
                - Proper spacing between sections
                
                Here is the transcript: ${transcript}`,
              },
            ],
          },
        ],
      }
    );

    const notes = response.data?.candidates?.[0]?.content?.parts
      ? [0]?.text ||
        "Could not generate notes. The API response format was unexpected."
      : console.log("Notes generated successfully");

    res.json({ notes });
  } catch (error) {
    console.error("Error generating notes:", error);
    res.status(500).json({
      error: "Error generating notes",
      message: error.response?.data?.error?.message || error.message,
    });
  }
});

// Serve React static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "react-transcript-notes/build")));

  app.get("*", (req, res) => {
    res.sendFile(
      path.join(__dirname, "react-transcript-notes/build", "index.html")
    );
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server available at http://localhost:${PORT}`);
  console.log("Using Vosk for audio transcription in the background");
  console.log("Using Web Speech API for live microphone transcription");
});
