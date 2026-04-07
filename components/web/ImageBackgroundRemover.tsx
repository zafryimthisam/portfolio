"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import * as imgly from "@imgly/background-removal";
import type { Config } from "@imgly/background-removal";

// ─── Types ────────────────────────────────────────────────────────────────────

type OutputFormat = "image/png" | "image/jpeg" | "image/webp";
type BgMode = "transparent" | "color" | "image";
type DragTarget = "subject" | "bg";

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface DocSize {
  label: string;
  ratio: string;
  widthMm: number;
  heightMm: number;
  widthIn: string;
  heightIn: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_SIZES: DocSize[] = [
  {
    label: "1:1 Square",
    ratio: "1:1",
    widthMm: 35,
    heightMm: 35,
    widthIn: "1.38",
    heightIn: "1.38",
  },
  {
    label: "3:4 Standard",
    ratio: "3:4",
    widthMm: 35,
    heightMm: 45,
    widthIn: "1.38",
    heightIn: "1.77",
  },
  {
    label: "4:5 Portrait",
    ratio: "4:5",
    widthMm: 40,
    heightMm: 50,
    widthIn: "1.57",
    heightIn: "1.97",
  },
  {
    label: "5:6 Compact",
    ratio: "5:6",
    widthMm: 35,
    heightMm: 42,
    widthIn: "1.38",
    heightIn: "1.65",
  },
  {
    label: "2:3 Tall",
    ratio: "2:3",
    widthMm: 51,
    heightMm: 76,
    widthIn: "2.00",
    heightIn: "3.00",
  },
  {
    label: "7:9 Wide",
    ratio: "7:9",
    widthMm: 35,
    heightMm: 45,
    widthIn: "1.38",
    heightIn: "1.77",
  },
];

const CANVAS_PREVIEW_SIZE = 400;

const FORMAT_EXT: Record<OutputFormat, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const PRESET_BG_COLORS = [
  "#ffffff",
  "#f0f0f0",
  "#e8f4fd",
  "#fef9e7",
  "#eafaf1",
  "#fdedec",
  "#1a1a2e",
  "#0d0d0d",
];

const GUIDE_TEXT = [
  {
    title: "1. Upload",
    description:
      "Choose an image from your device, or drag and drop one into the upload area.",
  },
  {
    title: "2. Remove background",
    description:
      "Press Remove Background. The image is processed in your browser.",
  },
  {
    title: "3. Edit",
    description:
      "Use the tabs to change the background, move the subject or background, crop, and set export options.",
  },
  {
    title: "4. Download",
    description: "Save the final photo in PNG, JPEG, or WEBP.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImageBackgroundRemover() {
  // Upload & processing
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready to upload.");
  const [progress, setProgress] = useState<string | null>(null);

  // Editor state
  const [activeTab, setActiveTab] = useState<
    "bg" | "subject" | "crop" | "export"
  >("bg");
  const [bgMode, setBgMode] = useState<BgMode>("transparent");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgTransform, setBgTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [subjectTransform, setSubjectTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [selectedDocSize, setSelectedDocSize] = useState<DocSize | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/png");
  const [outputQuality, setOutputQuality] = useState(0.92);

  // Drag state
  const [dragTarget, setDragTarget] = useState<DragTarget>("subject");
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    tx: number;
    ty: number;
    target: DragTarget;
  } | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Loaded image elements for canvas drawing
  const subjectImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  const getCanvasDimensions = useCallback(() => {
    if (selectedDocSize) {
      const { widthMm, heightMm } = selectedDocSize;
      if (widthMm >= heightMm) {
        return {
          w: CANVAS_PREVIEW_SIZE,
          h: Math.round((CANVAS_PREVIEW_SIZE * heightMm) / widthMm),
        };
      }
      return {
        h: CANVAS_PREVIEW_SIZE,
        w: Math.round((CANVAS_PREVIEW_SIZE * widthMm) / heightMm),
      };
    }
    return { w: CANVAS_PREVIEW_SIZE, h: CANVAS_PREVIEW_SIZE };
  }, [selectedDocSize]);

  const drawCanvas = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const { w, h } = getCanvasDimensions();
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // Background layer
    if (bgMode === "color") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    } else if (bgMode === "image" && bgImgRef.current) {
      const img = bgImgRef.current;
      const { x, y, scale } = bgTransform;
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const cx = w / 2 + x - drawW / 2;
      const cy = h / 2 + y - drawH / 2;
      ctx.drawImage(img, cx, cy, drawW, drawH);
    } else if (bgMode === "transparent") {
      const sq = 16;
      for (let row = 0; row * sq < h; row++) {
        for (let col = 0; col * sq < w; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? "#d0d0d0" : "#f8f8f8";
          ctx.fillRect(col * sq, row * sq, sq, sq);
        }
      }
    }

    // Subject layer
    if (subjectImgRef.current) {
      const img = subjectImgRef.current;
      const { x, y, scale } = subjectTransform;
      const fitScale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const drawW = img.naturalWidth * fitScale * scale;
      const drawH = img.naturalHeight * fitScale * scale;
      const cx = w / 2 + x - drawW / 2;
      const cy = h / 2 + y - drawH / 2;
      ctx.drawImage(img, cx, cy, drawW, drawH);
    }
  }, [bgMode, bgColor, bgTransform, subjectTransform, getCanvasDimensions]);

  useEffect(() => {
    if (!processedImageUrl) {
      subjectImgRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      subjectImgRef.current = img;
      drawCanvas();
    };
    img.src = processedImageUrl;
  }, [processedImageUrl, drawCanvas]);

  useEffect(() => {
    if (!bgImageUrl) {
      bgImgRef.current = null;
      return;
    }

    const img = new Image();
    img.onload = () => {
      bgImgRef.current = img;
      drawCanvas();
    };
    img.src = bgImageUrl;
  }, [bgImageUrl, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ── Drag handlers: pointer events work for mouse, touch, and pen ──────────

  const beginDrag = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = previewCanvasRef.current;
      if (!canvas || !processedImageUrl) return;

      const target = dragTarget;
      const currentTransform = target === "bg" ? bgTransform : subjectTransform;

      isDraggingRef.current = true;
      dragStartRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        tx: currentTransform.x,
        ty: currentTransform.y,
        target,
      };

      canvas.setPointerCapture(e.pointerId);
    },
    [bgTransform, subjectTransform, dragTarget, processedImageUrl],
  );

  const moveDrag = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      if (dragStartRef.current.pointerId !== e.pointerId) return;

      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      const target = dragStartRef.current.target;
      const baseX = dragStartRef.current.tx;
      const baseY = dragStartRef.current.ty;

      const nextTransform = {
        ...(target === "bg" ? bgTransform : subjectTransform),
        x: baseX + dx,
        y: baseY + dy,
      };

      if (target === "bg") {
        setBgTransform(nextTransform);
      } else {
        setSubjectTransform(nextTransform);
      }
    },
    [bgTransform, subjectTransform],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current?.pointerId === e.pointerId) {
      isDraggingRef.current = false;
      dragStartRef.current = null;
    }
  }, []);

  const cancelDrag = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragStartRef.current?.pointerId === e.pointerId) {
      isDraggingRef.current = false;
      dragStartRef.current = null;
    }
  }, []);

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB.");
      return;
    }

    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);

    setUploadedFile(file);
    setOriginalImageUrl(URL.createObjectURL(file));
    setProcessedImageUrl(null);
    setSubjectTransform({ x: 0, y: 0, scale: 1 });
    setError(null);
    setProgress(null);
    setStatus("Image uploaded. You can now remove the background.");
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleBgImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (bgImageUrl) URL.revokeObjectURL(bgImageUrl);

    setBgImageUrl(URL.createObjectURL(file));
    setBgMode("image");
    setBgTransform({ x: 0, y: 0, scale: 1 });
  };

  // ── Background removal ────────────────────────────────────────────────────

  const removeBackground = async () => {
    if (!uploadedFile) return;

    setLoading(true);
    setError(null);
    setProgress(null);
    setStatus("Starting background removal...");

    try {
      const config: Config = {
        output: { format: "image/png", quality: 1 },
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            setProgress(
              `${key.includes("fetch") ? "Downloading model" : "Processing"}: ${pct}%`,
            );
          }
        },
      };

      setStatus("Removing background...");
      const resultBlob: Blob = await imgly.removeBackground(
        uploadedFile,
        config,
      );
      const url = URL.createObjectURL(resultBlob);

      setProcessedImageUrl(url);
      setProgress(null);
      setStatus("Done. Use the edit tools below to adjust the photo.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to remove background.",
      );
      setStatus("Processing failed.");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────

  const downloadImage = () => {
    if (!previewCanvasRef.current) return;

    const { w, h } = getCanvasDimensions();
    const exportCanvas = document.createElement("canvas");
    const scale = 2;
    exportCanvas.width = w * scale;
    exportCanvas.height = h * scale;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, w, h);

    if (bgMode === "color") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    } else if (bgMode === "image" && bgImgRef.current) {
      const img = bgImgRef.current;
      const { x, y, scale: s } = bgTransform;
      const drawW = img.naturalWidth * s;
      const drawH = img.naturalHeight * s;
      ctx.drawImage(
        img,
        w / 2 + x - drawW / 2,
        h / 2 + y - drawH / 2,
        drawW,
        drawH,
      );
    } else if (bgMode === "transparent") {
      const sq = 16;
      for (let row = 0; row * sq < h; row++) {
        for (let col = 0; col * sq < w; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? "#d0d0d0" : "#f8f8f8";
          ctx.fillRect(col * sq, row * sq, sq, sq);
        }
      }
    }

    if (subjectImgRef.current) {
      const img = subjectImgRef.current;
      const { x, y, scale: s } = subjectTransform;
      const fitScale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      const drawW = img.naturalWidth * fitScale * s;
      const drawH = img.naturalHeight * fitScale * s;
      ctx.drawImage(
        img,
        w / 2 + x - drawW / 2,
        h / 2 + y - drawH / 2,
        drawW,
        drawH,
      );
    }

    const mimeType = outputFormat;
    const quality = mimeType === "image/png" ? undefined : outputQuality;
    const dataUrl = exportCanvas.toDataURL(mimeType, quality);

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `passport-photo.${FORMAT_EXT[outputFormat]}`;
    a.click();
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = () => {
    setUploadedFile(null);

    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl);
    if (bgImageUrl) URL.revokeObjectURL(bgImageUrl);

    setOriginalImageUrl(null);
    setProcessedImageUrl(null);
    setBgImageUrl(null);
    setBgMode("transparent");
    setBgColor("#ffffff");
    setSubjectTransform({ x: 0, y: 0, scale: 1 });
    setBgTransform({ x: 0, y: 0, scale: 1 });
    setSelectedDocSize(null);
    setDragTarget("subject");
    setError(null);
    setProgress(null);
    setStatus("Ready to upload.");

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (bgFileInputRef.current) bgFileInputRef.current.value = "";
  };

  const hasFile = !!uploadedFile;
  const hasResult = !!processedImageUrl;
  const { w: canvasW, h: canvasH } = getCanvasDimensions();

  const guideHeader = hasResult
    ? "Touch or click the photo, then drag the selected layer. Use the toggle below to switch between Subject and Background."
    : originalImageUrl
      ? "Your image is uploaded. Click Remove Background to create the editable photo."
      : "Start by uploading a photo from your device.";

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-mono p-3 md:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <div className="border border-neutral-800 bg-black/80 p-4 md:p-6 shadow-2xl shadow-black/40">
          <h1 className="text-center text-3xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Remove Background for Free
          </h1>
          <p className="mt-3 text-center text-sm md:text-base text-neutral-400">
            Remove the background, add a color or image, crop to a document
            size, and download the result — all in your browser.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          {/* ── Left Panel ── */}
          <aside className="border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30 space-y-4">
            {/* Upload */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">
                1. Upload Image
              </h2>
              <label
                htmlFor="image-upload"
                className="block rounded-xl border border-dashed border-neutral-700 bg-neutral-900/70 p-5 text-sm text-neutral-300 hover:border-amber-400/70 transition cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  id="image-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
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
                  {hasFile ? (
                    <span className="text-xs text-amber-400 truncate block">
                      {uploadedFile!.name} •{" "}
                      {(uploadedFile!.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">
                      PNG, JPEG, WEBP, BMP up to 50 MB
                    </span>
                  )}
                </div>
              </label>
            </div>

            {/* Remove BG button */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">
                2. Remove Background
              </h2>
              <button
                type="button"
                onClick={removeBackground}
                disabled={loading || !hasFile}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Processing..." : "Remove Background"}
              </button>
              <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-1">
                <p className="text-xs text-neutral-400">{status}</p>
                {progress && (
                  <p className="text-xs text-amber-400">{progress}</p>
                )}
                {error && <p className="text-xs text-red-400">{error}</p>}
                <p className="text-[10px] text-neutral-600">
                  100% in-browser. Your image stays on your device.
                </p>
              </div>
            </div>

            {/* Editor Tabs */}
            {hasResult && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  3. Edit
                </h2>

                <div className="grid grid-cols-4 gap-1 mb-3">
                  {(["bg", "subject", "crop", "export"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold transition capitalize ${
                        activeTab === tab
                          ? "bg-amber-500 text-black"
                          : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
                      }`}
                    >
                      {tab === "bg"
                        ? "BG"
                        : tab === "subject"
                          ? "Subject"
                          : tab === "crop"
                            ? "Crop"
                            : "Export"}
                    </button>
                  ))}
                </div>

                {/* BG Tab */}
                {activeTab === "bg" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(["transparent", "color", "image"] as BgMode[]).map(
                        (m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setBgMode(m)}
                            className={`rounded-lg py-2 text-xs font-semibold capitalize transition ${
                              bgMode === m
                                ? "bg-amber-500 text-black"
                                : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-amber-500/50"
                            }`}
                          >
                            {m}
                          </button>
                        ),
                      )}
                    </div>

                    {bgMode === "color" && (
                      <div className="space-y-2">
                        <label className="text-xs text-neutral-400">
                          Background Color
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="w-12 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                          />
                          <input
                            type="text"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                            className="flex-1 rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {PRESET_BG_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setBgColor(c)}
                              className={`w-7 h-7 rounded-md border-2 transition ${bgColor === c ? "border-amber-400" : "border-neutral-700"}`}
                              style={{ backgroundColor: c }}
                              aria-label={`Set background color to ${c}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {bgMode === "image" && (
                      <div className="space-y-3">
                        <label
                          htmlFor="bg-image-upload"
                          className="block rounded-xl border border-dashed border-neutral-700 bg-neutral-900/70 p-4 text-center text-xs text-neutral-400 hover:border-amber-400/70 transition cursor-pointer"
                        >
                          <input
                            id="bg-image-upload"
                            ref={bgFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBgImageSelect}
                          />
                          {bgImageUrl
                            ? "Background image loaded. Tap to change it."
                            : "Upload a background image"}
                        </label>
                        {bgImageUrl && (
                          <>
                            <label className="text-xs text-neutral-400">
                              BG Scale: {bgTransform.scale.toFixed(2)}x
                            </label>
                            <input
                              type="range"
                              min={0.1}
                              max={5}
                              step={0.01}
                              value={bgTransform.scale}
                              onChange={(e) =>
                                setBgTransform((t) => ({
                                  ...t,
                                  scale: parseFloat(e.target.value),
                                }))
                              }
                              className="w-full accent-amber-500"
                            />
                            <p className="text-[10px] text-neutral-500">
                              Use the drag controls below to move the
                              background.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setBgTransform({ x: 0, y: 0, scale: 1 })
                              }
                              className="text-xs text-neutral-500 hover:text-amber-400 transition"
                            >
                              Reset background position
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Subject Tab */}
                {activeTab === "subject" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
                      <p className="text-xs text-neutral-400 mb-2">Drag mode</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDragTarget("subject")}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            dragTarget === "subject"
                              ? "bg-amber-500 text-black"
                              : "bg-neutral-950 border border-neutral-700 text-neutral-300 hover:border-amber-500/50"
                          }`}
                        >
                          Move Subject
                        </button>
                        <button
                          type="button"
                          onClick={() => setDragTarget("bg")}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            dragTarget === "bg"
                              ? "bg-amber-500 text-black"
                              : "bg-neutral-950 border border-neutral-700 text-neutral-300 hover:border-amber-500/50"
                          }`}
                        >
                          Move Background
                        </button>
                      </div>
                      <p className="mt-2 text-[10px] text-neutral-500">
                        Tap a mode first, then drag on the preview. This works
                        with mouse, touch, and pen.
                      </p>
                    </div>

                    <label className="text-xs text-neutral-400">
                      Subject Scale: {subjectTransform.scale.toFixed(2)}x
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={3}
                      step={0.01}
                      value={subjectTransform.scale}
                      onChange={(e) =>
                        setSubjectTransform((t) => ({
                          ...t,
                          scale: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-amber-500"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-neutral-400">
                          X offset: {subjectTransform.x}px
                        </label>
                        <input
                          type="range"
                          min={-200}
                          max={200}
                          step={1}
                          value={subjectTransform.x}
                          onChange={(e) =>
                            setSubjectTransform((t) => ({
                              ...t,
                              x: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full accent-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400">
                          Y offset: {subjectTransform.y}px
                        </label>
                        <input
                          type="range"
                          min={-200}
                          max={200}
                          step={1}
                          value={subjectTransform.y}
                          onChange={(e) =>
                            setSubjectTransform((t) => ({
                              ...t,
                              y: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSubjectTransform({ x: 0, y: 0, scale: 1 })
                      }
                      className="text-xs text-neutral-500 hover:text-amber-400 transition"
                    >
                      Reset subject position
                    </button>
                  </div>
                )}

                {/* Crop Tab */}
                {activeTab === "crop" && (
                  <div className="space-y-2">
                    <p className="text-xs text-neutral-400 mb-2">
                      Choose a document size. The preview will update to match
                      the selected ratio.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedDocSize(null)}
                      className={`w-full rounded-lg px-3 py-2 text-xs font-semibold text-left transition ${
                        !selectedDocSize
                          ? "bg-amber-500 text-black"
                          : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-amber-500/50"
                      }`}
                    >
                      No crop (free)
                    </button>
                    {DOC_SIZES.map((size) => (
                      <button
                        key={size.label}
                        type="button"
                        onClick={() => setSelectedDocSize(size)}
                        className={`w-full rounded-lg px-3 py-2 text-xs font-semibold text-left transition flex justify-between items-center ${
                          selectedDocSize?.label === size.label
                            ? "bg-amber-500 text-black"
                            : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-amber-500/50"
                        }`}
                      >
                        <span>{size.label}</span>
                        <span className="opacity-70">
                          {size.widthMm}×{size.heightMm}mm
                        </span>
                      </button>
                    ))}
                    {selectedDocSize && (
                      <p className="text-[10px] text-neutral-500 pt-1">
                        Preview ratio: {selectedDocSize.widthIn}" ×{" "}
                        {selectedDocSize.heightIn}" ({selectedDocSize.ratio})
                      </p>
                    )}
                  </div>
                )}

                {/* Export Tab */}
                {activeTab === "export" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-neutral-400 block mb-1">
                        Output Format
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            "image/png",
                            "image/jpeg",
                            "image/webp",
                          ] as OutputFormat[]
                        ).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setOutputFormat(fmt)}
                            className={`rounded-lg py-2 text-xs font-semibold transition ${
                              outputFormat === fmt
                                ? "bg-amber-500 text-black"
                                : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-amber-500/50"
                            }`}
                          >
                            {FORMAT_EXT[fmt].toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {outputFormat !== "image/png" && (
                      <div>
                        <label className="text-xs text-neutral-400 block mb-1">
                          Quality: {Math.round(outputQuality * 100)}%
                        </label>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.01}
                          value={outputQuality}
                          onChange={(e) =>
                            setOutputQuality(parseFloat(e.target.value))
                          }
                          className="w-full accent-amber-500"
                        />
                      </div>
                    )}

                    {outputFormat === "image/png" && (
                      <p className="text-[10px] text-neutral-500">
                        PNG is lossless, so no quality slider is needed.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={downloadImage}
                disabled={!hasResult}
                className="rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40 text-sm"
              >
                Download
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-neutral-800 text-sm"
              >
                Reset
              </button>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-2">
              <h2 className="text-base md:text-lg font-semibold text-white">
                How to use
              </h2>
              <p className="text-xs md:text-sm text-neutral-400">
                {guideHeader}
              </p>
              <div className="grid gap-2 pt-2">
                {GUIDE_TEXT.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-3"
                  >
                    <p className="text-sm font-semibold text-amber-300">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Right Panel: Preview ── */}
          <main className="border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30">
            <div className="mb-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold">Preview</h2>
                  <p className="text-sm text-neutral-400">
                    {hasResult
                      ? `Current drag mode: ${dragTarget === "subject" ? "Subject" : "Background"}. Use the toggle in the Subject tab to switch layers.`
                      : originalImageUrl
                        ? "Background removal is ready. Click the button in the left panel to continue."
                        : "Upload an image to begin."}
                  </p>
                </div>
                {selectedDocSize && (
                  <span className="text-[10px] text-amber-400 border border-amber-400/30 rounded px-2 py-0.5 whitespace-nowrap">
                    {selectedDocSize.label}
                  </span>
                )}
              </div>
            </div>

            {!originalImageUrl ? (
              <div className="flex items-center justify-center border border-dashed border-neutral-700 bg-black/30 rounded-lg h-96 text-center text-neutral-500 px-6">
                Upload an image to see the preview here.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Original */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-neutral-300">
                      Original
                    </h3>
                    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-900">
                      <img
                        src={originalImageUrl}
                        alt="Original"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    </div>
                  </div>

                  {/* Composite canvas */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-neutral-300">
                        Edited Output {hasResult ? "✓" : "(processing...)"}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDragTarget("subject")}
                          disabled={!hasResult}
                          className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                            dragTarget === "subject"
                              ? "bg-amber-500 text-black"
                              : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-amber-500/50"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          Subject drag
                        </button>
                        <button
                          type="button"
                          onClick={() => setDragTarget("bg")}
                          disabled={!hasResult}
                          className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                            dragTarget === "bg"
                              ? "bg-amber-500 text-black"
                              : "bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-amber-500/50"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          BG drag
                        </button>
                      </div>
                    </div>

                    <div className="border border-neutral-700 rounded-lg overflow-hidden flex items-center justify-center bg-neutral-900 min-h-[300px]">
                      {hasResult ? (
                        <canvas
                          ref={previewCanvasRef}
                          width={canvasW}
                          height={canvasH}
                          onPointerDown={beginDrag}
                          onPointerMove={moveDrag}
                          onPointerUp={endDrag}
                          onPointerCancel={cancelDrag}
                          onPointerLeave={cancelDrag}
                          className="max-w-full max-h-96 cursor-move touch-none select-none"
                          style={{
                            imageRendering: "auto",
                            touchAction: "none",
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-72 text-neutral-500 text-sm px-6 text-center">
                          {loading
                            ? "Removing background..."
                            : "Click Remove Background to process the photo."}
                        </div>
                      )}
                    </div>
                    {hasResult && (
                      <p className="text-[10px] text-neutral-600 text-center">
                        Preview: {canvasW}×{canvasH}px · Download uses 2×
                        resolution.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
