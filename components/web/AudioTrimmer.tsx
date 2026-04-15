"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "../ui/slider";

type DragEvent = React.DragEvent<HTMLElement>;
type PeaksInstance = any;
type ExportFormat = "wav" | "mp3" | "m4a" | "ogg";

const SEGMENT_ID = "trim-range";
const MIN_ZOOM_SCALE = 512;
const MIN_SEGMENT_SECONDS = 0.05;
const MIN_SEGMENT_DRAG_PX = 12;
const EPSILON = 0.0001;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00.00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeSegmentRange(
  start: number,
  end: number,
  duration: number,
): { startTime: number; endTime: number } {
  const total = Math.max(0, duration);

  if (total <= EPSILON) return { startTime: 0, endTime: 0 };

  let s = clamp(Number.isFinite(start) ? start : 0, 0, total);
  let e = clamp(Number.isFinite(end) ? end : total, 0, total);

  if (e < s) [s, e] = [e, s];

  const snapThreshold = Math.min(0.25, total * 0.05);
  if (s <= snapThreshold) s = 0;
  if (total - e <= snapThreshold) e = total;

  const minWidth = Math.min(MIN_SEGMENT_SECONDS, total);
  if (e - s < minWidth) {
    if (e >= total) s = Math.max(0, total - minWidth);
    else e = Math.min(total, s + minWidth);
  }

  if (e <= s) e = Math.min(total, s + Math.min(minWidth, total));

  return { startTime: s, endTime: e };
}

function fileExtension(name: string | undefined | null): string {
  if (!name) return "";
  const parts = name.split(".");
  if (parts.length < 2) return "";
  return parts.pop()?.toLowerCase() ?? "";
}

function normalizeExportFormat(format: ExportFormat): string {
  return format === "m4a" ? "m4a" : format;
}

function mimeForFormat(format: ExportFormat): string {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "ogg":
      return "audio/ogg";
    case "wav":
    default:
      return "audio/wav";
  }
}

function labelForFormat(format: ExportFormat): string {
  switch (format) {
    case "mp3":
      return "MP3";
    case "m4a":
      return "M4A";
    case "ogg":
      return "OGG";
    case "wav":
    default:
      return "WAV";
  }
}

function getOutputFilename(
  originalName: string | undefined,
  format: ExportFormat,
  isTrimmed: boolean,
) {
  const base = (originalName ?? "audio").replace(/\.[^.]+$/, "");
  const prefix = isTrimmed ? "trimmed-" : "exported-";
  return `${prefix}${base}.${normalizeExportFormat(format)}`;
}

function isSameFormatAsOriginal(
  original: File | null,
  format: ExportFormat,
): boolean {
  if (!original) return false;
  const ext = fileExtension(original.name);
  if (!ext) return false;
  return ext === normalizeExportFormat(format);
}

// ── icons ─────────────────────────────────────────────────────────────────────
function IconUpload() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-8 w-8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M6.3 2.841A1.5 1.5 0 004.5 4.13v15.74a1.5 1.5 0 002.328 1.247l12.675-7.87a1.5 1.5 0 000-2.494L6.3 2.841z" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconReset() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function IconWaveform() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12h2m14 0h2M7 8v8M17 8v8M11 5v14M13 5v14"
      />
    </svg>
  );
}

function IconScissors() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-4 w-4"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"
      />
    </svg>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({
  current,
  duration,
  start,
  end,
}: {
  current: number;
  duration: number;
  start: number;
  end: number;
}) {
  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const startPct = duration > 0 ? (start / duration) * 100 : 0;
  const endPct = duration > 0 ? (end / duration) * 100 : 0;

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
      <div
        className="absolute inset-y-0 bg-amber-500/25"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />
      <div
        className="absolute inset-y-0 w-0.5 bg-amber-400"
        style={{ left: `${startPct}%` }}
      />
      <div
        className="absolute inset-y-0 w-0.5 bg-amber-400"
        style={{ left: `${endPct}%` }}
      />
      <div
        className="absolute inset-y-0 w-0.5 bg-white/80 transition-[left] duration-75"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-neutral-500">
        {label}
      </p>
      <p
        className={`mt-0.5 font-mono text-base font-semibold ${accent ? "text-amber-300" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeading({ step, label }: { step: string; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
        {step}
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-300">
        {label}
      </h2>
    </div>
  );
}

const EXPORT_FORMATS: { value: ExportFormat; label: string; hint: string }[] = [
  { value: "wav", label: "WAV", hint: "Lossless" },
  { value: "mp3", label: "MP3", hint: "Smaller" },
  { value: "m4a", label: "M4A", hint: "Apple-friendly" },
  { value: "ogg", label: "OGG", hint: "Open format" },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function AudioTrimmer() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const zoomviewRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const peaksRef = useRef<PeaksInstance | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const originalFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loadTokenRef = useRef(0);
  const zoomWindowSecondsRef = useRef<number>(0);

  const ffmpegRef = useRef<any>(null);
  const ffmpegLoadPromiseRef = useRef<Promise<any> | null>(null);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [peaksReady, setPeaksReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomWindowSeconds, setZoomWindowSeconds] = useState(12);
  const [exportDone, setExportDone] = useState(false);
  const [zoomBounds, setZoomBounds] = useState({ min: 1, max: 1 });
  const [exportFormat, setExportFormat] = useState<ExportFormat>("wav");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const normalizedRange = useMemo(() => {
    if (!audioBuffer) return null;
    return normalizeSegmentRange(
      trimStartSec,
      trimEndSec,
      audioBuffer.duration,
    );
  }, [audioBuffer, trimEndSec, trimStartSec]);

  const selectedDuration = normalizedRange
    ? Math.max(0, normalizedRange.endTime - normalizedRange.startTime)
    : 0;

  const isFullSelection = useMemo(() => {
    if (!audioBuffer || !normalizedRange) return false;
    return (
      normalizedRange.startTime <= EPSILON &&
      normalizedRange.endTime >= audioBuffer.duration - EPSILON
    );
  }, [audioBuffer, normalizedRange]);

  const revokeAudioUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const destroyPeaks = useCallback(() => {
    const peaks = peaksRef.current;
    peaksRef.current = null;
    setPeaksReady(false);
    if (peaks) {
      try {
        peaks.destroy();
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxRef.current = new AC();

    return () => {
      destroyPeaks();
      revokeAudioUrl();
      try {
        audioCtxRef.current?.close();
      } catch {
        /* ignore */
      }
    };
  }, [destroyPeaks, revokeAudioUrl]);

  const getZoomBounds = useCallback(() => {
    const buffer = audioBufferRef.current;
    const zoomEl = zoomviewRef.current;
    if (!buffer || !zoomEl) return null;

    const width = Math.max(1, zoomEl.clientWidth || 1);
    const minFromScale = (MIN_ZOOM_SCALE * width) / buffer.sampleRate;
    const minSec = Math.min(buffer.duration, Math.max(minFromScale, 0.25));

    return { min: minSec, max: buffer.duration };
  }, []);

  const fitWaveformToContainer = useCallback(() => {
    const peaks = peaksRef.current;
    const zoomView = peaks?.views.getView("zoomview");
    const overviewView = peaks?.views.getView("overview");
    const scrollbarView = peaks?.views.getScrollbar();

    try {
      zoomView?.fitToContainer?.();
    } catch {
      /* ignore */
    }
    try {
      overviewView?.fitToContainer?.();
    } catch {
      /* ignore */
    }
    try {
      scrollbarView?.fitToContainer?.();
    } catch {
      /* ignore */
    }
  }, []);

  const applyResponsiveZoom = useCallback(
    (requestedSeconds?: number) => {
      const peaks = peaksRef.current;
      const zoomView = peaks?.views.getView("zoomview");
      const buffer = audioBufferRef.current;
      const bounds = getZoomBounds();

      if (!peaks || !zoomView || !buffer || !bounds) return;

      setZoomBounds(bounds);

      try {
        zoomView.setStartTime(0);
      } catch {
        /* ignore */
      }

      const isShortAudio = bounds.max <= bounds.min + EPSILON;

      if (isShortAudio) {
        try {
          zoomView.setZoom({ scale: MIN_ZOOM_SCALE });
        } catch {
          /* ignore */
        }
        fitWaveformToContainer();
        return;
      }

      const defaultSeconds =
        zoomWindowSecondsRef.current > 0
          ? zoomWindowSecondsRef.current
          : buffer.duration;

      const next = clamp(
        requestedSeconds ?? defaultSeconds,
        bounds.min,
        bounds.max,
      );

      zoomWindowSecondsRef.current = next;
      setZoomWindowSeconds(next);

      try {
        zoomView.setZoom({ seconds: next });
      } catch {
        try {
          zoomView.setZoom({ scale: MIN_ZOOM_SCALE });
        } catch {
          /* ignore */
        }
      }

      fitWaveformToContainer();
    },
    [fitWaveformToContainer, getZoomBounds],
  );

  const refreshZoom = useCallback(() => {
    if (!audioBufferRef.current || !peaksRef.current) return;
    applyResponsiveZoom();
  }, [applyResponsiveZoom]);

  useEffect(() => {
    zoomWindowSecondsRef.current = zoomWindowSeconds;
  }, [zoomWindowSeconds]);

  useEffect(() => {
    const onResize = () => refreshZoom();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [refreshZoom]);

  useEffect(() => {
    if (!audioBuffer) return;
    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => refreshZoom());
    if (zoomviewRef.current) ro.observe(zoomviewRef.current);
    if (overviewRef.current) ro.observe(overviewRef.current);
    if (scrollbarRef.current) ro.observe(scrollbarRef.current);

    return () => ro.disconnect();
  }, [audioBuffer, refreshZoom]);

  const syncTrimFromSegment = useCallback(() => {
    const peaks = peaksRef.current;
    const buffer = audioBufferRef.current;
    if (!peaks || !buffer) return;

    const seg = peaks.segments.getSegment(SEGMENT_ID);
    if (!seg) return;

    const range = normalizeSegmentRange(
      seg.startTime,
      seg.endTime,
      buffer.duration,
    );

    setTrimStartSec(range.startTime);
    setTrimEndSec(range.endTime);
  }, []);

  const clampActiveSegmentToAudio = useCallback(() => {
    const peaks = peaksRef.current;
    const buffer = audioBufferRef.current;
    if (!peaks || !buffer) return;

    const seg = peaks.segments.getSegment(SEGMENT_ID);
    if (!seg) return;

    const range = normalizeSegmentRange(
      seg.startTime,
      seg.endTime,
      buffer.duration,
    );

    if (
      Math.abs(range.startTime - seg.startTime) > EPSILON ||
      Math.abs(range.endTime - seg.endTime) > EPSILON
    ) {
      seg.update(range);
    }

    setTrimStartSec(range.startTime);
    setTrimEndSec(range.endTime);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    const peaks = peaksRef.current;
    const audio = audioRef.current;
    const buffer = audioBufferRef.current;
    if (!peaks || !audio || !buffer) return;

    const seg = peaks.segments.getSegment(SEGMENT_ID);
    if (!seg) {
      setCurrentTime(time);
      return;
    }

    const range = normalizeSegmentRange(
      seg.startTime,
      seg.endTime,
      buffer.duration,
    );

    if (time >= range.endTime - 0.01) {
      audio.pause();
      try {
        peaks.player.pause();
      } catch {
        /* ignore */
      }
      try {
        peaks.player.seek(range.startTime);
      } catch {
        /* ignore */
      }
      setCurrentTime(range.startTime);
      setIsPlaying(false);
      return;
    }

    setCurrentTime(time);
  }, []);

  const audioBufferToWav = useCallback((buffer: AudioBuffer) => {
    const { length, numberOfChannels, sampleRate } = buffer;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = length * blockAlign;

    const ab = new ArrayBuffer(44 + dataSize);
    const v = new DataView(ab);

    const ws = (o: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
    };

    ws(0, "RIFF");
    v.setUint32(4, 36 + dataSize, true);
    ws(8, "WAVE");
    ws(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, numberOfChannels, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * blockAlign, true);
    v.setUint16(32, blockAlign, true);
    v.setUint16(34, 16, true);
    ws(36, "data");
    v.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numberOfChannels; c++) {
        const sample = clamp(buffer.getChannelData(c)[i], -1, 1);
        v.setInt16(offset, sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([ab], { type: "audio/wav" });
  }, []);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, []);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    if (ffmpegLoadPromiseRef.current) return ffmpegLoadPromiseRef.current;

    ffmpegLoadPromiseRef.current = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");

      const ffmpeg = new FFmpeg();

      ffmpeg.on("progress", ({ progress }: { progress: number }) => {
        setExportProgress(
          Math.max(0, Math.min(100, Math.round(progress * 100))),
        );
      });

      const baseURL =
        "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });

      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    })();

    try {
      return await ffmpegLoadPromiseRef.current;
    } finally {
      ffmpegLoadPromiseRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!audioBuffer) return;

    let cancelled = false;
    const token = loadTokenRef.current;

    const init = async () => {
      const audioEl = audioRef.current;
      const zoomEl = zoomviewRef.current;
      const overviewEl = overviewRef.current;
      const scrollbarEl = scrollbarRef.current;
      const buffer = audioBufferRef.current;

      if (!audioEl || !zoomEl || !overviewEl || !scrollbarEl || !buffer) return;

      try {
        setLoadProgress(80);

        const PeaksModule = await import("peaks.js");
        const PeaksLib = (PeaksModule as any).default ?? PeaksModule;

        if (cancelled || token !== loadTokenRef.current) return;

        const peaks = await new Promise<PeaksInstance>((resolve, reject) => {
          PeaksLib.init(
            {
              zoomview: {
                container: zoomEl,
                waveformColor: "rgba(0, 225, 128, 1)",
                playedWaveformColor: "rgba(0, 225, 128, 0.28)",
                playheadColor: "#fbbf24",
                playheadTextColor: "#fbbf24",
                playheadBackgroundColor: "rgba(0,0,0,0.85)",
                playheadPadding: 2,
                playheadWidth: 1.5,
                showPlayheadTime: true,
                timeLabelPrecision: 2,
                axisGridlineColor: "#1a1a1a",
                axisLabelColor: "#d4d4d4",
                fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
                fontSize: 10,
                fontStyle: "normal",
                wheelMode: "scroll",
                autoScroll: true,
                autoScrollOffset: 100,
                enablePoints: false,
                enableSegments: true,
                showAxisLabels: true,
                overlayLabelColor: "#ffffff",
              },
              overview: {
                container: overviewEl,
                waveformColor: "rgba(0, 225, 128, 1)",
                playedWaveformColor: "rgba(0, 225, 128, 0.2)",
                highlightColor: "rgba(251,191,36,0.18)",
                highlightStrokeColor: "rgba(251,191,36,0.75)",
                highlightOpacity: 0.25,
                highlightCornerRadius: 3,
                highlightOffset: 10,
                playheadColor: "#fbbf24",
                playheadTextColor: "#fbbf24",
                playheadBackgroundColor: "rgba(0,0,0,0.85)",
                playheadPadding: 2,
                showPlayheadTime: false,
                timeLabelPrecision: 2,
                axisGridlineColor: "#1a1a1a",
                axisLabelColor: "#d4d4d4",
                fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
                fontSize: 10,
                fontStyle: "normal",
                enablePoints: false,
                enableSegments: true,
              },
              scrollbar: {
                container: scrollbarEl,
                color: "#fbbf24",
                minWidth: 50,
              },
              mediaElement: audioEl,
              webAudio: { audioBuffer: buffer },
              keyboard: true,
              emitCueEvents: false,
              enablePoints: false,
              enableSegments: true,
              zoomLevels: [512, 1024, 2048, 4096, 8192, 16384],
              segmentOptions: {
                overlay: true,
                overlayLabelColor: "#aaaaaa",
                startMarkerColor: "#aaaaaa",
                overlayFontSize: 12,
                overlayLabelAlign: "top-left",
              },
            },
            (err: any, instance: PeaksInstance) => {
              if (err) {
                reject(err);
                return;
              }
              resolve(instance);
            },
          );
        });

        if (cancelled || token !== loadTokenRef.current) {
          try {
            peaks.destroy();
          } catch {
            /* ignore */
          }
          return;
        }

        peaksRef.current = peaks;

        const zoomView = peaks.views.getView("zoomview");
        const overviewView = peaks.views.getView("overview");

        try {
          zoomView?.enableSegmentDragging(true);
          zoomView?.setSegmentDragMode("no-overlap");
          zoomView?.setMinSegmentDragWidth(MIN_SEGMENT_DRAG_PX);
          zoomView?.enableSeek(true);
          zoomView?.setWheelMode("scroll", { captureVerticalScroll: true });
          zoomView?.enableAutoScroll(true, { offset: 100 });
        } catch {
          /* ignore */
        }

        try {
          overviewView?.enableSeek(true);
        } catch {
          /* ignore */
        }

        peaks.on("player.timeupdate", (time: number) => {
          if (cancelled || token !== loadTokenRef.current) return;
          handleTimeUpdate(time);
        });

        peaks.on("player.playing", () => {
          if (cancelled || token !== loadTokenRef.current) return;
          setIsPlaying(true);
        });

        peaks.on("player.pause", () => {
          if (cancelled || token !== loadTokenRef.current) return;
          setIsPlaying(false);
        });

        peaks.on("player.seeked", (time: number) => {
          if (cancelled || token !== loadTokenRef.current) return;
          setCurrentTime(time);
        });

        peaks.on("segments.dragged", () => {
          if (cancelled || token !== loadTokenRef.current) return;
          clampActiveSegmentToAudio();
        });

        peaks.on("segments.dragend", () => {
          if (cancelled || token !== loadTokenRef.current) return;
          clampActiveSegmentToAudio();
          refreshZoom();

          const seg = peaks.segments.getSegment(SEGMENT_ID);
          const audio = audioRef.current;
          if (seg && audio && audioBufferRef.current) {
            const range = normalizeSegmentRange(
              seg.startTime,
              seg.endTime,
              audioBufferRef.current.duration,
            );

            const clamped = clamp(
              audio.currentTime,
              range.startTime,
              range.endTime,
            );

            if (clamped !== audio.currentTime) {
              audio.currentTime = clamped;
              setCurrentTime(clamped);
              try {
                peaks.player.seek(clamped);
              } catch {
                /* ignore */
              }
            }
          }
        });

        peaks.segments.add({
          id: SEGMENT_ID,
          startTime: 0,
          endTime: buffer.duration,
          editable: true,
          color: "rgba(251,191,36,0.15)",
          borderColor: "#fbbf24",
          markers: true,
          overlay: true,
          labelText: "Trim range",
        });

        setLoadProgress(95);

        requestAnimationFrame(() => {
          if (cancelled || token !== loadTokenRef.current) return;

          try {
            zoomView?.setStartTime(0);
          } catch {
            /* ignore */
          }

          applyResponsiveZoom();

          setLoadProgress(100);
          setPeaksReady(true);
          setLoading(false);

          setTimeout(() => {
            fitWaveformToContainer();
            syncTrimFromSegment();
          }, 0);
        });
      } catch (err) {
        if (cancelled || token !== loadTokenRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load audio file.",
        );
        destroyPeaks();
        setLoading(false);
      }
    };

    requestAnimationFrame(() => {
      if (!cancelled) init();
    });

    return () => {
      cancelled = true;
      destroyPeaks();
    };
  }, [
    applyResponsiveZoom,
    audioBuffer,
    clampActiveSegmentToAudio,
    destroyPeaks,
    fitWaveformToContainer,
    handleTimeUpdate,
    refreshZoom,
    syncTrimFromSegment,
  ]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("audio/")) {
        setError("Please choose a valid audio file (MP3, WAV, OGG, etc.).");
        return;
      }

      if (file.size > 200 * 1024 * 1024) {
        setError("File size must be less than 200 MB.");
        return;
      }

      const audioCtx = audioCtxRef.current;
      const audioEl = audioRef.current;
      if (!audioCtx || !audioEl) {
        setError("Audio editor is not ready yet.");
        return;
      }

      const loadToken = ++loadTokenRef.current;

      setLoading(true);
      setLoadProgress(10);
      setError(null);
      setUploadedFile(file);
      originalFileRef.current = file;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setTrimStartSec(0);
      setTrimEndSec(0);
      setPeaksReady(false);
      setExportDone(false);
      setZoomBounds({ min: 1, max: 1 });
      zoomWindowSecondsRef.current = 12;
      setZoomWindowSeconds(12);

      destroyPeaks();
      revokeAudioUrl();

      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.load();

      try {
        const arrayBuffer = await file.arrayBuffer();
        if (loadToken !== loadTokenRef.current) return;
        setLoadProgress(40);

        const buffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        if (loadToken !== loadTokenRef.current) return;
        setLoadProgress(65);

        audioBufferRef.current = buffer;
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
        setTrimStartSec(0);
        setTrimEndSec(buffer.duration);
        setCurrentTime(0);

        const initialZoom = Math.max(1, buffer.duration);
        zoomWindowSecondsRef.current = initialZoom;
        setZoomWindowSeconds(initialZoom);

        const objectUrl = URL.createObjectURL(file);
        objectUrlRef.current = objectUrl;
        audioEl.src = objectUrl;
        audioEl.load();
        setLoadProgress(75);
      } catch (err) {
        if (loadToken !== loadTokenRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load audio file.",
        );
        setLoading(false);
      }
    },
    [destroyPeaks, revokeAudioUrl],
  );

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => setIsDraggingOver(false);

  const handlePlay = useCallback(async () => {
    const audio = audioRef.current;
    const peaks = peaksRef.current;
    const buffer = audioBufferRef.current;
    if (!audio || !peaks || !buffer || isPlaying) return;

    if (audioCtxRef.current?.state === "suspended") {
      try {
        await audioCtxRef.current.resume();
      } catch {
        /* ignore */
      }
    }

    const seg = peaks.segments.getSegment(SEGMENT_ID);
    const range = normalizeSegmentRange(
      seg?.startTime ?? trimStartSec,
      seg?.endTime ?? trimEndSec,
      buffer.duration,
    );

    if (range.endTime <= range.startTime) return;

    if (
      audio.currentTime < range.startTime ||
      audio.currentTime >= range.endTime
    ) {
      audio.currentTime = range.startTime;
      try {
        peaks.player.seek(range.startTime);
      } catch {
        /* ignore */
      }
      setCurrentTime(range.startTime);
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setError("Playback could not start in this browser.");
    }
  }, [isPlaying, trimEndSec, trimStartSec]);

  const handlePause = useCallback(() => {
    const audio = audioRef.current;
    const peaks = peaksRef.current;
    if (!audio) return;

    audio.pause();
    try {
      peaks?.player.pause();
    } catch {
      /* ignore */
    }
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    const audio = audioRef.current;
    const peaks = peaksRef.current;
    const total =
      audioBufferRef.current?.duration ?? audioBuffer?.duration ?? 0;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    try {
      peaks?.player.pause();
    } catch {
      /* ignore */
    }

    try {
      peaks?.player.seek(0);
    } catch {
      /* ignore */
    }

    const seg = peaks?.segments.getSegment(SEGMENT_ID);
    if (seg) seg.update({ startTime: 0, endTime: total });

    setTrimStartSec(0);
    setTrimEndSec(total);
    setCurrentTime(0);
    setIsPlaying(false);
    const initialZoom = Math.max(1, total);
    zoomWindowSecondsRef.current = initialZoom;
    setZoomWindowSeconds(initialZoom);
    applyResponsiveZoom();
  }, [applyResponsiveZoom, audioBuffer?.duration]);

  const buildTrimArgs = useCallback(
    (format: ExportFormat, startTime: number, endTime: number) => {
      const duration = Math.max(0.001, endTime - startTime);

      const common = [
        "-hide_banner",
        "-y",
        "-i",
        "input.ext",
        "-ss",
        `${startTime.toFixed(3)}`,
        "-t",
        `${duration.toFixed(3)}`,
        "-map",
        "0:a:0",
        "-vn",
      ];

      switch (format) {
        case "mp3":
          return [...common, "-c:a", "libmp3lame", "-q:a", "2", "output.mp3"];
        case "m4a":
          return [
            ...common,
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            "output.m4a",
          ];
        case "ogg":
          return [...common, "-c:a", "libvorbis", "-q:a", "6", "output.ogg"];
        case "wav":
        default:
          return [...common, "-c:a", "pcm_s16le", "output.wav"];
      }
    },
    [],
  );

  const exportAudio = useCallback(async () => {
    const buffer = audioBufferRef.current;
    const original = originalFileRef.current;
    if (!buffer || !original) return;

    const peaks = peaksRef.current;
    const seg = peaks?.segments.getSegment(SEGMENT_ID);

    const range = normalizeSegmentRange(
      seg?.startTime ?? trimStartSec,
      seg?.endTime ?? trimEndSec,
      buffer.duration,
    );

    const filenameBase = original.name?.replace(/\.[^.]+$/, "") ?? "audio";
    const originalExt = fileExtension(original.name) || "audio";
    const desiredExt = normalizeExportFormat(exportFormat);

    try {
      setError(null);
      setExportDone(false);
      setIsExporting(true);
      setExportProgress(0);

      if (
        range.startTime <= EPSILON &&
        range.endTime >= buffer.duration - EPSILON &&
        originalExt === desiredExt
      ) {
        downloadBlob(
          original,
          original.name || `${filenameBase}.${desiredExt}`,
        );
        setExportDone(true);
        setTimeout(() => setExportDone(false), 2500);
        return;
      }

      if (
        range.startTime <= EPSILON &&
        range.endTime >= buffer.duration - EPSILON &&
        originalExt !== desiredExt
      ) {
        // Full-file transcode, no trimming.
      }

      const ffmpeg = await loadFFmpeg();
      const inputName = `input.${originalExt !== "audio" ? originalExt : "bin"}`;
      const outputName = `output.${desiredExt}`;
      const inputData = new Uint8Array(await original.arrayBuffer());

      await ffmpeg.writeFile(inputName, inputData);

      const duration = Math.max(0.001, range.endTime - range.startTime);

      const args = [
        "-hide_banner",
        "-y",
        "-i",
        inputName,
        "-ss",
        `${range.startTime.toFixed(3)}`,
        "-t",
        `${duration.toFixed(3)}`,
        "-map",
        "0:a:0",
        "-vn",
      ];

      if (desiredExt === "mp3") {
        args.push("-c:a", "libmp3lame", "-q:a", "2");
      } else if (desiredExt === "m4a") {
        args.push("-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart");
      } else if (desiredExt === "ogg") {
        args.push("-c:a", "libvorbis", "-q:a", "6");
      } else {
        args.push("-c:a", "pcm_s16le");
      }

      args.push(outputName);

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const bytes =
        data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);

      const blob = new Blob([bytes.slice().buffer as ArrayBuffer], {
        type: mimeForFormat(exportFormat),
      });
      downloadBlob(
        blob,
        getOutputFilename(original.name, exportFormat, !isFullSelection),
      );

      setExportDone(true);
      setTimeout(() => setExportDone(false), 2500);
    } catch (err) {
      if (exportFormat === "wav" && buffer) {
        try {
          const seg = peaksRef.current?.segments.getSegment(SEGMENT_ID);
          const range = normalizeSegmentRange(
            seg?.startTime ?? trimStartSec,
            seg?.endTime ?? trimEndSec,
            buffer.duration,
          );

          const startSample = clamp(
            Math.floor(range.startTime * buffer.sampleRate),
            0,
            buffer.length,
          );
          const endSample = clamp(
            Math.ceil(range.endTime * buffer.sampleRate),
            startSample + 1,
            buffer.length,
          );

          const len = endSample - startSample;
          const trimmed = new AudioBuffer({
            length: len,
            numberOfChannels: buffer.numberOfChannels,
            sampleRate: buffer.sampleRate,
          });

          for (let c = 0; c < buffer.numberOfChannels; c++) {
            const src = buffer.getChannelData(c);
            const dst = trimmed.getChannelData(c);
            for (let i = 0; i < len; i++) {
              dst[i] = src[startSample + i];
            }
          }

          const wavBlob = audioBufferToWav(trimmed);
          downloadBlob(
            wavBlob,
            getOutputFilename(original.name, exportFormat, !isFullSelection),
          );
          setExportDone(true);
          setTimeout(() => setExportDone(false), 2500);
          return;
        } catch {
          /* ignore fallback failure */
        }
      }

      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [
    audioBufferToWav,
    downloadBlob,
    exportFormat,
    isFullSelection,
    loadFFmpeg,
    trimEndSec,
    trimStartSec,
  ]);

  useEffect(() => {
    if (!peaksReady) return;
    refreshZoom();
  }, [peaksReady, refreshZoom]);

  const canZoomMore = zoomBounds.max > zoomBounds.min + EPSILON;
  const progressPct = loading ? loadProgress : 0;

  const exportButtonLabel = isFullSelection
    ? `Download ${labelForFormat(exportFormat)}`
    : `Export Trimmed ${labelForFormat(exportFormat)}`;

  return (
    <div className="bg-neutral-950 font-mono text-white">
      <audio ref={audioRef} className="hidden" preload="auto" />

      <input
        id="audio-upload"
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
          e.currentTarget.value = "";
        }}
      />

      <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-3 md:px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <IconScissors />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-amber-300">
              AUDIO TRIMMER
            </h1>
            <p className="text-[10px] tracking-widest text-neutral-500">
              PRECISION WAVE EDITOR
            </p>
          </div>

          {audioBuffer && (
            <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
              <span className="hidden md:block">{uploadedFile?.name}</span>
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-neutral-400">
                {formatTime(duration)}
              </span>
              {isPlaying && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  PLAYING
                </span>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="h-0.5 bg-neutral-900">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </header>

      <div className="mx-auto max-w-screen-2xl space-y-0">
        {!audioBuffer ? (
          <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 py-12">
            <div className="mb-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <IconWaveform />
              </div>
              <h2 className="text-2xl font-bold text-white md:text-3xl">
                Drop your audio file
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Drag & drop or click to upload. Supports MP3, WAV, OGG, FLAC —
                up to 200 MB.
              </p>
            </div>

            <label
              htmlFor="audio-upload"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`group relative flex w-full max-w-lg cursor-pointer flex-col items-center gap-5 rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200 ${
                isDraggingOver
                  ? "border-amber-400 bg-amber-500/10"
                  : "border-neutral-700 bg-neutral-900/50 hover:border-amber-500/60 hover:bg-neutral-900"
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full border transition-colors ${
                  isDraggingOver
                    ? "border-amber-400 text-amber-400"
                    : "border-neutral-700 text-neutral-500 group-hover:border-amber-500/50 group-hover:text-amber-400/80"
                }`}
              >
                <IconUpload />
              </div>

              <div>
                <p className="text-base font-semibold text-white">
                  {isDraggingOver ? "Release to upload" : "Choose a file"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">or drag it here</p>
              </div>

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-neutral-950/90">
                  <div className="mb-3 text-sm font-semibold text-amber-400">
                    Decoding audio…
                  </div>
                  <div className="h-1 w-40 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${loadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </label>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/50 px-4 py-2.5 text-sm text-red-400">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0 xl:min-h-[calc(100vh-57px)] xl:flex-row">
            <aside className="w-full flex-shrink-0 space-y-5 border-b border-neutral-800 bg-neutral-950 p-4 xl:w-72 xl:border-b-0 xl:border-r xl:p-5">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                    <IconWaveform />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs font-medium text-white"
                      title={uploadedFile?.name}
                    >
                      {uploadedFile?.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-neutral-500">
                      {uploadedFile && formatFileSize(uploadedFile.size)} ·{" "}
                      {audioBuffer.sampleRate / 1000}kHz ·{" "}
                      {audioBuffer.numberOfChannels === 1 ? "Mono" : "Stereo"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-800/60 py-1.5 text-[11px] text-neutral-400 transition hover:border-neutral-600 hover:text-white"
                >
                  ↑ Replace file
                </button>
              </div>

              <div>
                <SectionHeading step="1" label="Trim Range" />
                <div className="grid grid-cols-2 gap-2">
                  <StatTile
                    label="Start"
                    value={formatTime(trimStartSec)}
                    accent
                  />
                  <StatTile label="End" value={formatTime(trimEndSec)} accent />
                </div>
                <div className="mt-2">
                  <StatTile
                    label="Selected Duration"
                    value={formatTime(selectedDuration)}
                    accent
                  />
                </div>
                <p className="mt-2 text-[10px] text-neutral-600">
                  Drag the gold handles in the waveform to set your trim range.
                </p>
              </div>

              <div>
                <SectionHeading step="2" label="Zoom" />
                <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Visible window</span>
                    <span className="font-mono text-amber-300">
                      {canZoomMore
                        ? `${zoomWindowSeconds.toFixed(1)}s`
                        : "Auto"}
                    </span>
                  </div>
                  {canZoomMore ? (
                    <Slider
                      value={[zoomWindowSeconds]}
                      min={zoomBounds.min}
                      max={zoomBounds.max}
                      step={0.5}
                      onValueChange={(v) => {
                        const next = v[0] ?? zoomWindowSeconds;
                        zoomWindowSecondsRef.current = next;
                        setZoomWindowSeconds(next);
                        applyResponsiveZoom(next);
                      }}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-[11px] text-neutral-600">
                      Audio too short to zoom further.
                    </p>
                  )}
                  <p className="text-[10px] text-neutral-600">
                    Smaller value = more zoom. Use scrollbar to navigate.
                  </p>
                </div>
              </div>

              <div>
                <SectionHeading step="3" label="Controls" />
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handlePlay}
                    disabled={!peaksReady || isPlaying}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2 py-3 text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconPlay />
                    <span className="text-[10px] uppercase tracking-wider">
                      Play
                    </span>
                  </button>

                  <button
                    onClick={handlePause}
                    disabled={!peaksReady || !isPlaying}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/50 px-2 py-3 text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconPause />
                    <span className="text-[10px] uppercase tracking-wider">
                      Pause
                    </span>
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={!peaksReady}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/50 px-2 py-3 text-neutral-300 transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconReset />
                    <span className="text-[10px] uppercase tracking-wider">
                      Reset
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <SectionHeading step="4" label="Export" />
                <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                      Format
                    </span>
                    <select
                      value={exportFormat}
                      onChange={(e) =>
                        setExportFormat(e.target.value as ExportFormat)
                      }
                      className="w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white outline-none transition focus:border-amber-500"
                    >
                      {EXPORT_FORMATS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-[10px] text-neutral-500">
                    {EXPORT_FORMATS.map((opt) => (
                      <div
                        key={opt.value}
                        className={`rounded-md border px-2 py-1 text-center ${
                          exportFormat === opt.value
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                            : "border-neutral-800 bg-neutral-950/40"
                        }`}
                      >
                        <div className="font-semibold">{opt.label}</div>
                        <div className="text-[9px]">{opt.hint}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={exportAudio}
                    disabled={
                      !audioBuffer || selectedDuration <= 0 || isExporting
                    }
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                      exportDone
                        ? "border-green-500/50 bg-green-500/15 text-green-300"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:border-amber-400/60 hover:bg-amber-500/20"
                    }`}
                  >
                    {isExporting ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
                        <span>
                          {exportProgress > 0
                            ? `${exportProgress}%`
                            : "Exporting"}
                        </span>
                      </>
                    ) : exportDone ? (
                      <>
                        <span className="text-base">✓</span>
                        <span>Downloaded!</span>
                      </>
                    ) : (
                      <>
                        <IconDownload />
                        <span>{exportButtonLabel}</span>
                      </>
                    )}
                  </button>

                  {isExporting && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="h-full bg-amber-500 transition-all duration-150"
                        style={{ width: `${exportProgress}%` }}
                      />
                    </div>
                  )}

                  {selectedDuration > 0 && (
                    <p className="text-center text-[10px] text-neutral-600">
                      {formatTime(selectedDuration)} ·{" "}
                      {isFullSelection
                        ? `original or ${labelForFormat(exportFormat)}`
                        : `${labelForFormat(exportFormat)} export`}
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-400">
                  ⚠ {error}
                </div>
              )}
            </aside>

            <main className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span className="font-mono text-white">
                    {formatTime(currentTime)}
                  </span>
                  <span className="font-mono">{formatTime(duration)}</span>
                </div>
                <ProgressBar
                  current={currentTime}
                  duration={duration}
                  start={trimStartSec}
                  end={trimEndSec}
                />
                <div className="flex justify-between text-[10px] text-neutral-600">
                  <span>▲ {formatTime(trimStartSec)}</span>
                  <span className="text-amber-500/70">
                    ■ {formatTime(selectedDuration)} selected
                  </span>
                  <span>▲ {formatTime(trimEndSec)}</span>
                </div>
              </div>

              <section className="mb-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                    Overview
                  </span>
                  <span className="font-mono text-[10px] text-amber-400/70">
                    {formatTime(duration)} total
                  </span>
                </div>

                <div
                  ref={overviewRef}
                  className="h-24 w-full overflow-hidden rounded-lg bg-black/60"
                />
              </section>

              <section className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-600">
                    Zoomed view
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-neutral-600">
                    <span>Scroll to pan · Drag gold handles to trim</span>
                    {isPlaying ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                        Live
                      </span>
                    ) : (
                      <span className="text-neutral-700">Paused</span>
                    )}
                  </div>
                </div>

                {!peaksReady && !loading && (
                  <div className="flex h-48 items-center justify-center rounded-lg bg-black/40">
                    <p className="text-xs text-neutral-600">
                      Waveform initializing…
                    </p>
                  </div>
                )}

                <div
                  ref={zoomviewRef}
                  className="w-full overflow-hidden rounded-lg bg-black/60"
                  style={{
                    width: "100%",
                    minHeight: "200px",
                    height: "clamp(200px, 30vh, 340px)",
                  }}
                />

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[10px] text-neutral-700">
                    <span>Scroll position</span>
                    <span>Drag the handle to navigate</span>
                  </div>
                  <div
                    ref={scrollbarRef}
                    className="h-8 w-full overflow-hidden rounded-lg bg-black/60"
                  />
                </div>
              </section>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {[
                  ["Space", "Play / Pause"],
                  ["← →", "Seek"],
                  ["Scroll", "Pan waveform"],
                ].map(([key, desc]) => (
                  <span key={key} className="text-[10px] text-neutral-700">
                    <kbd className="mr-1 rounded border border-neutral-800 bg-neutral-900 px-1 py-0.5 text-neutral-500">
                      {key}
                    </kbd>
                    {desc}
                  </span>
                ))}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
