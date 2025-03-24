# Transcript Notes Application

A comprehensive web application for recording audio, transcribing speech, and generating AI-powered notes.

## Overview

This application combines browser-based and server-side speech recognition with AI note generation. It allows you to record audio directly through your microphone or upload audio files, transcribe the content, and generate well-structured Markdown notes using Google's Gemini AI.

## Features

- **Dual Transcription Systems**:

  - **Live Recording**: Browser-based Web Speech API for real-time transcription
  - **File Upload**: Server-side Vosk for offline transcription of audio files

- **Recording Controls**:

  - Quick recording (10 seconds)
  - Long recording (30 minutes)
  - Pause/resume functionality
  - Recording timer display

- **AI-Powered Notes Generation**:

  - Transforms transcripts into organized notes using Gemini AI
  - Markdown formatting with headers, lists, emphasis, and quotes
  - View both rendered and raw Markdown

- **User-Friendly Interface**:
  - Visual sound wave during recording
  - Progress indicators during processing
  - Responsive design

## Technology Stack

### Frontend

- React 16
- React Markdown for rendering notes
- Web Speech API for browser-based transcription
- React-Mic for audio recording visualization

### Backend

- Node.js with Express
- Python with Vosk for offline transcription
- FFmpeg for audio conversion
- Gemini API for notes generation

## Setup Instructions

### Prerequisites

- Node.js v16+ and npm
- Python 3.7+ with pip
- FFmpeg installed and in your PATH
- Google API key for Gemini AI

### Installation

1. **Clone the repository**

2. **Install server dependencies**

   ```bash
   npm install
   ```

3. **Set up Python environment for Vosk**

   ```bash
   ./vosk-setup.bat
   ```

   This will install the required Python packages and download the Vosk model.

4. **Install React dependencies**

   ```bash
   cd react-transcript-notes
   npm install --legacy-peer-deps
   cd ..
   ```

5. **Configure API keys**
   - Create `.env` in the root directory:
     ```
     API_KEY=your_gemini_api_key
     ```
   - Create `.env` in the `react-transcript-notes` directory:
     ```
     REACT_APP_GEMINI_API_KEY=your_gemini_api_key
     ```

### Running the Application

1. **Start the backend server**

   ```bash
   npm start
   ```

   This will start the Express server on port 5000.

2. **Start the React frontend** (in a new terminal)

   ```bash
   cd react-transcript-notes
   npm start
   ```

   This will start the React development server on port 3000.

3. **Access the application**
   Open your browser to [http://localhost:3000](http://localhost:3000)

## Usage Guide

### Recording from Microphone

1. Click "Record from Mic" for a quick 10-second recording
2. Click "Record 30 Minutes" for a longer session
3. Use pause/resume/stop buttons to control the recording
4. The Web Speech API will transcribe your speech in real-time
5. After stopping, the transcript will be sent to Gemini AI for note generation

### Uploading Audio Files

1. Click "Select Audio File" and choose a WAV, MP3, or M4A file
2. The file will be processed by the server using Vosk
3. The transcript will be sent to Gemini AI for note generation

### Working with Notes

- Notes are displayed in formatted Markdown
- Click "View Raw Markdown" to see and copy the Markdown source
- Notes are organized with headers, lists, and emphasis as appropriate

## Troubleshooting

### Audio Recording Issues

- **Microphone Access**: Ensure your browser has permission to access your microphone
- **Transcription Not Working**: Try Chrome or Edge for best Web Speech API support

### Audio File Processing Issues

- **FFmpeg Not Found**: Ensure FFmpeg is installed and in your PATH
- **Vosk Model Missing**: Run `vosk-setup.bat` to download the model
- **Python Issues**: Ensure Python 3.7+ is installed with vosk and pydub packages

### API Issues

- **Notes Generation Fails**: Verify your Gemini API key is correct and has proper permissions
- **Server Connection Errors**: Ensure the backend server is running on port 5000

## Advanced Configuration

### Using a Different Vosk Model

1. Download a different model from [Vosk's website](https://alphacephei.com/vosk/models)
2. Extract it to the project directory
3. Update the `modelPath` variable in `server-vosk-fixed.js`

### Customizing Notes Format

Modify the prompt in the `generateNotes` function in `notesGenerationService.js` to change how the AI formats the notes.
