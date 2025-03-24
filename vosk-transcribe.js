
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
