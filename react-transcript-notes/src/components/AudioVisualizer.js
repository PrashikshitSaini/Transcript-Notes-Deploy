import React, { useRef, useEffect } from "react";

const AudioVisualizer = ({ isRecording, isPaused }) => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize the audio context and analyzer
  useEffect(() => {
    // Clean up function for all resources
    const cleanup = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach((track) => track.stop());
      }

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };

    return cleanup;
  }, []);

  // Handle recording state changes
  useEffect(() => {
    if (isRecording && !isPaused) {
      startVisualization();
    } else {
      stopVisualization();
    }

    // Clean up when unmounting
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const startVisualization = async () => {
    try {
      // Reset previous animation if any
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      streamRef.current = stream;

      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();

      // Create analyzer
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Connect the microphone to the analyzer
      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);

      // Create data array for visualization
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Start drawing
      draw();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Clear the canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Stop the tracks
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const draw = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Get the frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw the visualizer with monochrome colors
    ctx.fillStyle = "#121212"; // Match app's background
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / dataArrayRef.current.length;

    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const barHeight = (dataArrayRef.current[i] / 255) * height * 0.8;

      // Create a monochrome gradient for the bars
      const gradient = ctx.createLinearGradient(
        0,
        height,
        0,
        height - barHeight
      );
      gradient.addColorStop(0, "#444444"); // Dark gray
      gradient.addColorStop(1, "#FFFFFF"); // White top

      ctx.fillStyle = gradient;

      // Draw bar
      const x = i * barWidth;
      const y = height - barHeight;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    animationFrameRef.current = requestAnimationFrame(draw);
  };

  return (
    <div className="audio-visualizer">
      <canvas
        ref={canvasRef}
        width="600"
        height="100"
        className="visualizer-canvas"
      />
    </div>
  );
};

export default AudioVisualizer;
