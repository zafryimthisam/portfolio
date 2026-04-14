"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";

type DragEvent = React.DragEvent<HTMLElement>;

export default function AudioTrimmer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Tracks the actual audio offset (seconds) to resume/reset from — separate from display state
  const playbackOffsetRef = useRef<number>(0);
  // Tracks the wall-clock time when playback started, for computing elapsed time
  const playStartedAtRef = useRef<number>(0);
  // RAF handle so we can cancel the animation loop on pause/stop
  const rafRef = useRef<number | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<"start" | "end" | null>(
    null,
  );

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 200;

  // Initialize AudioContext
  useEffect(() => {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
  }, []);

  // Cancel any running RAF loop
  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Stop the current audio source node and cancel the timeline loop
  const stopSource = useCallback(() => {
    cancelRaf();
    try {
      sourceRef.current?.stop();
    } catch {
      // ignore if already stopped
    }
    sourceRef.current = null;
  }, [cancelRaf]);

  // Handle file upload
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("audio/")) {
        setError("Please choose a valid audio file.");
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        setError("File size must be less than 100MB.");
        return;
      }

      stopSource();
      setIsPlaying(false);
      playbackOffsetRef.current = 0;

      setUploadedFile(file);
      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) return;

        try {
          const audioCtx = audioCtxRef.current;
          if (!audioCtx) return;

          const buffer = await audioCtx.decodeAudioData(arrayBuffer);
          setAudioBuffer(buffer);

          // Generate waveform data
          const rawData = buffer.getChannelData(0);
          const samples = 1000;
          const blockSize = Math.floor(rawData.length / samples);
          const filteredData: number[] = [];

          for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(rawData[blockStart + j]);
            }
            filteredData.push(sum / blockSize);
          }

          setWaveformData(filteredData);
          setTrimEnd(1);
          setCurrentTime(0);
          playbackOffsetRef.current = 0;
        } catch {
          setError("Failed to load audio file.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [stopSource],
  );

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || waveformData.length === 0) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / waveformData.length;
    const maxAmplitude = Math.max(...waveformData);

    // Draw waveform bars
    ctx.fillStyle = "#fa34a3";
    for (let i = 0; i < waveformData.length; i++) {
      const barHeight = (waveformData[i] / maxAmplitude) * canvas.height;
      ctx.fillRect(
        i * barWidth,
        canvas.height - barHeight,
        barWidth - 1,
        barHeight,
      );
    }

    // Draw trim range overlay
    const startX = trimStart * canvas.width;
    const endX = trimEnd * canvas.width;
    ctx.fillStyle = "rgba(251, 191, 36, 0.3)";
    ctx.fillRect(startX, 0, endX - startX, canvas.height);

    // Draw current time line within trim range
    if (audioBuffer) {
      const startTime = trimStart * audioBuffer.duration;
      const endTime = trimEnd * audioBuffer.duration;
      if (currentTime >= startTime && currentTime <= endTime) {
        const timeX =
          startX +
          ((currentTime - startTime) / (endTime - startTime)) * (endX - startX);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(timeX, 0);
        ctx.lineTo(timeX, canvas.height);
        ctx.stroke();
      }
    }

    // Draw trim handles
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(startX - 5, 0, 10, canvas.height);
    ctx.fillRect(endX - 5, 0, 10, canvas.height);
  }, [waveformData, trimStart, trimEnd, currentTime, audioBuffer]);

  // Handle canvas pointer events for dragging handles
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (isPlaying) {
        handlePause();
      }

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const startX = trimStart * canvas.width;
      const endX = trimEnd * canvas.width;

      if (Math.abs(x - startX) < 10) {
        setDraggingHandle("start");
        canvas.setPointerCapture(e.pointerId);
      } else if (Math.abs(x - endX) < 10) {
        setDraggingHandle("end");
        canvas.setPointerCapture(e.pointerId);
      }
    },
    [trimStart, trimEnd, isPlaying],
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draggingHandle) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let ratio = x / canvas.width;
      ratio = Math.max(0, Math.min(1, ratio));

      if (draggingHandle === "start") {
        setTrimStart(Math.min(ratio, trimEnd - 0.01));
      } else if (draggingHandle === "end") {
        setTrimEnd(Math.max(ratio, trimStart + 0.01));
      }
    },
    [draggingHandle, trimStart, trimEnd],
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      setDraggingHandle(null);
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {}
      }
    },
    [],
  );

  // Play trimmed audio
  const handlePlay = useCallback(async () => {
    const audioCtx = audioCtxRef.current;
    const analyser = analyserRef.current;
    if (!audioCtx || !audioBuffer || !analyser) return;
    if (isPlaying) return;

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    stopSource();

    const startTime = trimStart * audioBuffer.duration;
    const endTime = trimEnd * audioBuffer.duration;

    // Resume from where we paused, or from trimStart if offset is out of range
    const savedOffset = playbackOffsetRef.current;
    const playFrom =
      savedOffset >= startTime && savedOffset < endTime
        ? savedOffset
        : startTime;

    const remainingDuration = endTime - playFrom;

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    sourceRef.current = source;

    // Record wall-clock start and the offset we're playing from
    playStartedAtRef.current = audioCtx.currentTime;
    playbackOffsetRef.current = playFrom;

    source.start(0, playFrom, remainingDuration);
    setIsPlaying(true);
    setCurrentTime(playFrom);

    // RAF loop — only updates display; cancellable on pause
    const tick = () => {
      const elapsed = audioCtx.currentTime - playStartedAtRef.current;
      const newTime = playFrom + elapsed;

      if (newTime >= endTime) {
        // Reached the end — reset to trimStart
        setCurrentTime(startTime);
        playbackOffsetRef.current = startTime;
        setIsPlaying(false);
        rafRef.current = null;
        return;
      }

      setCurrentTime(newTime);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    source.onended = () => {
      // onended fires both on natural end AND on .stop() call.
      // Only reset state if we weren't explicitly stopped (RAF already cancelled by stopSource).
      if (rafRef.current !== null) {
        cancelRaf();
        setCurrentTime(startTime);
        playbackOffsetRef.current = startTime;
        setIsPlaying(false);
      }
    };
  }, [isPlaying, audioBuffer, trimStart, trimEnd, stopSource, cancelRaf]);

  // Pause: stop source, cancel RAF, save current position
  const handlePause = useCallback(() => {
    if (!isPlaying) return;

    const audioCtx = audioCtxRef.current;
    if (audioCtx) {
      // Capture current position before stopping
      const elapsed = audioCtx.currentTime - playStartedAtRef.current;
      const startTime = trimStart * (audioBuffer?.duration ?? 0);
      const savedOffset = playbackOffsetRef.current;
      const pausedAt = savedOffset + elapsed;
      const endTime = trimEnd * (audioBuffer?.duration ?? 0);
      playbackOffsetRef.current = Math.min(pausedAt, endTime);
    }

    // Cancel the RAF loop BEFORE stopping the source so onended doesn't reset state
    cancelRaf();
    try {
      sourceRef.current?.stop();
    } catch {}
    sourceRef.current = null;

    setIsPlaying(false);
  }, [isPlaying, audioBuffer, trimStart, trimEnd, cancelRaf]);

  // Reset: stop everything and go back to trimStart
  const handleReset = useCallback(() => {
    stopSource();
    setIsPlaying(false);
    setTrimStart(0);
    setTrimEnd(1);
    // Reset playback offset to the very beginning of the (now-reset) trim range
    playbackOffsetRef.current = 0;
    setCurrentTime(0);
  }, [stopSource]);

  // Export trimmed audio as WAV
  const exportAudio = useCallback(() => {
    if (!audioBuffer) return;

    const startSample = Math.floor(trimStart * audioBuffer.length);
    const endSample = Math.floor(trimEnd * audioBuffer.length);
    const length = endSample - startSample;

    const trimmedBuffer = new AudioBuffer({
      length,
      numberOfChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    });

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel);
      const trimmedData = trimmedBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        trimmedData[i] = originalData[startSample + i];
      }
    }

    const wavBlob = audioBufferToWav(trimmedBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trimmed-audio.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [audioBuffer, trimStart, trimEnd]);

  const audioBufferToWav = (buffer: AudioBuffer) => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, buffer.getChannelData(channel)[i]),
        );
        view.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-mono p-3 md:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="border border-neutral-800 bg-black/80 p-4 md:p-6 shadow-2xl shadow-black/40">
          <h1 className="text-center text-3xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Audio Trimmer Tool
          </h1>
          <p className="mt-3 text-center text-sm md:text-base text-neutral-400">
            Upload an audio file, select the trim range, and download the
            trimmed version.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
          <aside className="border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">
                1. Upload Audio
              </h2>
              <label
                htmlFor="audio-upload"
                className="block rounded-xl border border-dashed border-neutral-700 bg-neutral-900/70 p-4 text-center text-xs text-neutral-400 hover:border-amber-400/70 transition cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  id="audio-upload"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                <div className="text-center">
                  <span className="block font-medium text-white mb-2">
                    Choose a file or drag it here
                  </span>
                  {uploadedFile ? (
                    <span className="text-xs text-amber-400 break-all block">
                      {uploadedFile.name} •{" "}
                      {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      MP3, WAV, OGG up to 100 MB
                    </span>
                  )}
                </div>
              </label>
              {loading && (
                <p className="text-xs text-amber-400 mt-2">Loading audio...</p>
              )}
              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>

            {audioBuffer && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-white mb-2">
                    2. Trim Range
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-neutral-400">
                        Start: {(trimStart * audioBuffer.duration).toFixed(2)}s
                      </label>
                      <Slider
                        value={[trimStart]}
                        min={0}
                        max={trimEnd}
                        step={0.01}
                        onValueChange={(value) => setTrimStart(value[0] ?? 0)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-400">
                        End: {(trimEnd * audioBuffer.duration).toFixed(2)}s
                      </label>
                      <Slider
                        value={[trimEnd]}
                        min={trimStart}
                        max={1}
                        step={0.01}
                        onValueChange={(value) => setTrimEnd(value[0] ?? 1)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-white mb-2">
                    3. Controls
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={handlePlay}
                      className="rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black transition hover:bg-amber-400 disabled:opacity-60"
                      disabled={!audioBuffer || isPlaying}
                    >
                      Play
                    </Button>
                    <Button
                      onClick={handlePause}
                      className="rounded-xl  px-4 py-3 font-semibold  transition  disabled:opacity-60"
                      disabled={!audioBuffer || !isPlaying}
                    >
                      Pause
                    </Button>
                    <Button
                      onClick={handleReset}
                      className="rounded-xl  px-4 py-3 font-semibold  transition  disabled:opacity-60"
                      disabled={!audioBuffer}
                      variant={"destructive"}
                    >
                      Reset
                    </Button>
                  </div>
                  <Button
                    onClick={exportAudio}
                    className="w-full rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 font-semibold text-amber-200 transition hover:bg-amber-500/20"
                    disabled={!audioBuffer}
                  >
                    Download Trimmed Audio
                  </Button>
                </div>
              </>
            )}
          </aside>

          <main className="border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30">
            <div className="mb-4">
              <h2 className="text-lg md:text-2xl font-semibold">
                Audio Preview
              </h2>
              <p className="text-sm text-neutral-400">
                {audioBuffer
                  ? `Duration: ${audioBuffer.duration.toFixed(2)}s`
                  : "Upload an audio file to get started."}
              </p>
            </div>

            <div className="flex items-center justify-center border border-neutral-700 bg-neutral-900 rounded-lg h-64">
              {waveformData.length > 0 ? (
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full cursor-crosshair"
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                />
              ) : (
                <p className="text-neutral-500">
                  Upload an audio file to get started.
                </p>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
