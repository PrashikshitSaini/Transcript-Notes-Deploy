
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
