"use client";

import {
  upload,
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  Image as IKImage,
} from "@imagekit/next";
import { toPng, toJpeg } from "html-to-image";
import { useEffect, useMemo, useRef, useState } from "react";

type LayoutPreset = "a4" | "story" | "post45" | "square";
type ExportFormat = "png" | "jpeg";

type CollageImage = {
  id: string;
  url: string;
  name: string;
  fileId?: string;
  filePath?: string;
};

const STORAGE_KEY = "collage-maker-images-v1";
const IK_URL_ENDPOINT = "https://ik.imagekit.io/zafry";

const PRESETS: Record<
  LayoutPreset,
  {
    label: string;
    ratio: number;
    width: number;
    height: number;
    subtitle: string;
  }
> = {
  a4: {
    label: "A4",
    ratio: 210 / 297,
    width: 2480,
    height: 3508,
    subtitle: "Default print-style portrait",
  },
  story: {
    label: "Instagram Story",
    ratio: 9 / 16,
    width: 1080,
    height: 1920,
    subtitle: "Tall vertical story layout",
  },
  post45: {
    label: "Instagram Post 4:5",
    ratio: 4 / 5,
    width: 1080,
    height: 1350,
    subtitle: "Portrait feed post layout",
  },
  square: {
    label: "Instagram Post 1:1",
    ratio: 1,
    width: 1080,
    height: 1080,
    subtitle: "Classic square layout",
  },
};

async function getUploadAuth() {
  const response = await fetch("/api/upload-auth");
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Auth request failed: ${response.status} ${errorText}`);
  }
  return response.json() as Promise<{
    token: string;
    expire: number;
    signature: string;
    publicKey: string;
  }>;
}

export default function CollageMaker() {
  const [images, setImages] = useState<CollageImage[]>([]);
  const [layout, setLayout] = useState<LayoutPreset>("a4");
  const [margin, setMargin] = useState(18);
  const [borderRadius, setBorderRadius] = useState(12); // ← NEW: Image roundness
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [bgColor, setBgColor] = useState("#09090b");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("Ready to upload.");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const preset = PRESETS[layout];
  const grid = useMemo(() => {
    const count = images.length;
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count <= 4) return { cols: 2, rows: Math.ceil(count / 2) };
    if (count <= 9) return { cols: 3, rows: Math.ceil(count / 3) };
    return { cols: 4, rows: Math.ceil(count / 4) };
  }, [images.length]);

  const [, forceUpdate] = useState(0);

  // Load / Save session
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CollageImage[];
        if (Array.isArray(parsed)) setImages(parsed);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(images));
  }, [images]);

  // File input live update
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;
    const handleChange = () => forceUpdate((x) => x + 1);
    input.addEventListener("change", handleChange);
    return () => input.removeEventListener("change", handleChange);
  }, []);

  const handleUpload = async () => {
    const input = fileInputRef.current;
    const files = input?.files;
    if (!files || files.length === 0) {
      setStatus("Select one or more images first.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus(
      `Uploading ${files.length} image${files.length > 1 ? "s" : ""}...`,
    );

    try {
      const uploaded: CollageImage[] = [];
      const total = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const auth = await getUploadAuth();

        const response = await upload({
          file,
          fileName: file.name,
          token: auth.token,
          expire: auth.expire,
          signature: auth.signature,
          publicKey: auth.publicKey,
          onProgress: (event) => {
            const fileProgress = event.total ? event.loaded / event.total : 0;
            const overall = ((i + fileProgress) / total) * 100;
            setProgress(Math.min(100, overall));
          },
        });

        uploaded.push({
          id: crypto.randomUUID(),
          url: response.url!,
          name: file.name,
          fileId: (response as any).fileId,
          filePath: (response as any).filePath,
        });
      }

      setImages((current) => [...current, ...uploaded]);
      setProgress(100);
      setStatus(
        `Uploaded ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      forceUpdate((x) => x + 1);
    } catch (error) {
      if (error instanceof ImageKitAbortError) setStatus("Upload cancelled.");
      else if (error instanceof ImageKitInvalidRequestError)
        setStatus(`Invalid upload request: ${error.message}`);
      else if (error instanceof ImageKitUploadNetworkError)
        setStatus(`Network error: ${error.message}`);
      else if (error instanceof ImageKitServerError)
        setStatus(`ImageKit server error: ${error.message}`);
      else setStatus("Upload failed. Please try again.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (id: string) =>
    setImages((c) => c.filter((img) => img.id !== id));
  const clearAll = () => {
    setImages([]);
    setStatus("All images cleared.");
  };

  const moveImage = (from: number, to: number) => {
    setImages((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  const shuffleImages = () => {
    setImages((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  // Perfect download using the exact preview DOM
  const downloadCollage = async () => {
    if (images.length === 0 || !previewRef.current) {
      setStatus("Add some images before downloading.");
      return;
    }

    setStatus("Generating download...");

    try {
      const element = previewRef.current;

      const dataUrl =
        exportFormat === "png"
          ? await toPng(element, {
              quality: 1,
              backgroundColor: bgColor,
              pixelRatio: 3,
            })
          : await toJpeg(element, {
              quality: 0.98,
              backgroundColor: bgColor,
              pixelRatio: 3,
            });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `collage-${layout}.${exportFormat}`;
      a.click();

      setStatus(`Downloaded as ${exportFormat.toUpperCase()}.`);
    } catch (err) {
      console.error(err);
      setStatus("Download failed. Please try again.");
    }
  };

  const selectedFiles = fileInputRef.current?.files;
  const hasSelectedFiles = selectedFiles && selectedFiles.length > 0;

  const previewRows = grid.rows;
  const previewCols = grid.cols;

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-mono p-3 md:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="rounded-2xl border border-neutral-800 bg-black/80 p-4 md:p-6 shadow-2xl shadow-black/40">
          <h1 className="text-center text-3xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Create awesome collages
          </h1>
          <p className="mt-3 text-center text-sm md:text-base text-neutral-400">
            Upload • Reorder • Modern grid • Export with ImageKit
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          {/* Sidebar */}
          <aside className="rounded-2xl border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30 space-y-4">
            <div>
              <h2 className="text-lg md:text-2xl font-semibold text-white">
                Upload
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Your images stay in session storage until the browser closes.
              </p>
            </div>

            <label
              htmlFor="image-upload"
              className="block rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/70 p-6 text-sm text-neutral-300 hover:border-amber-400/70 transition cursor-pointer"
            >
              <input
                id="image-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
              />
              <div className="text-center">
                <span className="block font-medium text-white text-base mb-3">
                  Choose images
                </span>
                {hasSelectedFiles ? (
                  <div className="space-y-1 text-left max-h-40 overflow-y-auto">
                    {Array.from(selectedFiles).map((file, index) => (
                      <div
                        key={index}
                        className="text-xs text-amber-400 font-medium truncate"
                      >
                        {file.name}
                      </div>
                    ))}
                    <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-800 mt-2">
                      {selectedFiles.length} file
                      {selectedFiles.length > 1 ? "s" : ""} selected
                    </div>
                  </div>
                ) : (
                  <span className="block text-xs text-neutral-500">
                    Any aspect ratio is fine
                  </span>
                )}
              </div>
            </label>

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !hasSelectedFiles}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload to ImageKit"}
            </button>

            <div className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Status</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <progress
                className="h-2 w-full overflow-hidden rounded-full"
                value={progress}
                max={100}
              />
              <p className="text-xs text-neutral-400">{status}</p>
            </div>

            {/* Layout & Export */}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-sm text-neutral-300">
                <span>Layout</span>
                <select
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as LayoutPreset)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-white outline-none"
                >
                  <option value="a4">A4</option>
                  <option value="story">Story</option>
                  <option value="post45">Post 4:5</option>
                  <option value="square">Post 1:1</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-neutral-300">
                <span>Export</span>
                <select
                  value={exportFormat}
                  onChange={(e) =>
                    setExportFormat(e.target.value as ExportFormat)
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-white outline-none"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </label>
            </div>

            {/* Margin */}
            <label className="block space-y-2 text-sm text-neutral-300">
              <div className="flex items-center justify-between">
                <span>Margin</span>
                <span className="text-xs text-neutral-400">{margin}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={48}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full"
              />
            </label>

            {/* NEW: Image Roundness */}
            <label className="block space-y-2 text-sm text-neutral-300">
              <div className="flex items-center justify-between">
                <span>Image roundness</span>
                <span className="text-xs text-neutral-400">
                  {borderRadius}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={32}
                value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className="w-full"
              />
            </label>

            {/* Background & Aspect */}
            <label className="block space-y-2 text-sm text-neutral-300">
              <div className="flex items-center justify-between">
                <span>Background</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-8 w-12 rounded-lg border border-neutral-700 bg-transparent cursor-pointer"
                />
              </div>
            </label>

            <label className="flex items-center gap-3 text-sm text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={maintainAspectRatio}
                onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="font-medium">Maintain aspect ratio</span>
            </label>

            {images.length > 1 && (
              <button
                onClick={shuffleImages}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition"
              >
                🎲 Shuffle order
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={downloadCollage}
                className="rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 font-semibold text-amber-200 transition hover:bg-amber-500/20"
              >
                Download collage
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-neutral-800"
              >
                Clear all
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-300">
              <div className="flex items-center justify-between">
                <span>{preset.label}</span>
                <span className="text-xs text-neutral-500">
                  {preset.subtitle}
                </span>
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                {maintainAspectRatio
                  ? "Images keep original aspect ratio and are centered"
                  : "Images stretch to completely fill each cell"}
              </p>
            </div>
          </aside>

          {/* Live Preview (this is what gets exported) */}
          <main className=" border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg md:text-2xl font-semibold">
                  Live Preview
                </h2>
                <p className="text-sm text-neutral-400">
                  {images.length} image{images.length === 1 ? "" : "s"} •{" "}
                  {previewCols}×{previewRows}
                </p>
              </div>
              <div className="text-xs text-neutral-500">
                Frame ratio: {preset.ratio.toFixed(3)}
              </div>
            </div>

            <div className="flex justify-center">
              <div
                ref={previewRef}
                className="w-full max-w-4xl border border-neutral-800 overflow-hidden"
                style={{
                  aspectRatio: `${preset.width} / ${preset.height}`,
                  backgroundColor: bgColor,
                }}
              >
                {images.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-700 bg-black/30 text-center text-neutral-500">
                    Upload images to see the collage here
                  </div>
                ) : (
                  <div
                    className="grid h-full w-full"
                    style={{
                      gap: `${margin}px`,
                      padding: "0px", // ← No outer padding anymore
                      gridTemplateColumns: `repeat(${previewCols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${previewRows}, minmax(0, 1fr))`,
                    }}
                  >
                    {images.map((img, index) => (
                      <div
                        key={img.id}
                        className="group relative overflow-hidden border border-white/10 bg-white/5 shadow-inner"
                        style={{
                          borderRadius: `${borderRadius}px`, // ← Dynamic roundness
                          gridColumn: `${(index % previewCols) + 1}`,
                          gridRow: `${Math.floor(index / previewCols) + 1}`,
                        }}
                      >
                        <IKImage
                          urlEndpoint={IK_URL_ENDPOINT}
                          src={img.filePath || img.url}
                          alt={img.name}
                          width={1200}
                          height={1200}
                          className={`h-full w-full transition-all duration-200 ${
                            maintainAspectRatio
                              ? "object-contain"
                              : "object-cover"
                          }`}
                          transformation={[{ width: 1200, height: 1200 }]}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail reorder section */}
            {images.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-neutral-400">
                    Images • Drag order with arrows
                  </p>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      className="group relative rounded-2xl border border-neutral-700 bg-neutral-900/60 overflow-hidden"
                    >
                      <IKImage
                        urlEndpoint={IK_URL_ENDPOINT}
                        src={img.filePath || img.url}
                        alt={img.name}
                        width={180}
                        height={180}
                        className="h-24 w-full object-cover"
                        transformation={[{ height: 180 }]}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent h-12" />
                      <p className="absolute bottom-1 left-2 text-[10px] text-white truncate max-w-[140px]">
                        {img.name}
                      </p>

                      <div className="absolute top-2 right-2 flex flex-col gap-px opacity-0 group-hover:opacity-100 transition">
                        {index > 0 && (
                          <button
                            onClick={() => moveImage(index, index - 1)}
                            className="bg-black/70 hover:bg-black text-white text-[10px] w-6 h-6 flex items-center justify-center rounded"
                          >
                            ↑
                          </button>
                        )}
                        {index < images.length - 1 && (
                          <button
                            onClick={() => moveImage(index, index + 1)}
                            className="bg-black/70 hover:bg-black text-white text-[10px] w-6 h-6 flex items-center justify-center rounded"
                          >
                            ↓
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
