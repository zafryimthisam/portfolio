"use client";
import { useState, useRef, useCallback } from "react";
import * as imgly from "@imgly/background-removal";
import type { Config } from "@imgly/background-removal";

export default function ImageBackgroundRemover() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Ready to upload.");
  const [progress, setProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB.");
      return;
    }
    setUploadedFile(file);
    setOriginalImageUrl(URL.createObjectURL(file));
    setProcessedImageUrl(null);
    setError(null);
    setProgress(null);
    setStatus("Image uploaded. Ready to remove background.");
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeBackground = async () => {
    if (!uploadedFile) return;
    setLoading(true);
    setError(null);
    setProgress(null);
    setStatus("Initialising model...");

    try {
      const config: Config = {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            const label = key.includes("fetch")
              ? "Downloading model"
              : "Processing";
            setProgress(`${label}: ${pct}%`);
          }
        },
      };

      setStatus("Removing background...");
      // imglyRemoveBackground accepts a Blob/File directly
      const resultBlob: Blob = await imgly.removeBackground(
        uploadedFile,
        config,
      );
      const url = URL.createObjectURL(resultBlob);
      setProcessedImageUrl(url);
      setProgress(null);
      setStatus("Background removed successfully!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to remove background",
      );
      setStatus("Processing failed.");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!processedImageUrl) return;
    const a = document.createElement("a");
    a.href = processedImageUrl;
    a.download = "background-removed.png";
    a.click();
  };

  const reset = () => {
    setUploadedFile(null);
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    if (processedImageUrl) URL.revokeObjectURL(processedImageUrl);
    setOriginalImageUrl(null);
    setProcessedImageUrl(null);
    setError(null);
    setProgress(null);
    setStatus("Ready to upload.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasFile = !!uploadedFile;

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-mono p-3 md:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="border border-neutral-800 bg-black/80 p-4 md:p-6 shadow-2xl shadow-black/40">
          <h1 className="text-center text-3xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Remove Image Background for Free
          </h1>
          <p className="mt-3 text-center text-sm md:text-base text-neutral-400">
            Upload an image and get a clean cutout with transparent background —
            processed entirely in your browser
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <aside className="border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30 space-y-4">
            <div>
              <h2 className="text-lg md:text-2xl font-semibold text-white">
                Upload Image
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Supported formats: PNG, JPEG, WEBP, BMP. Max 50MB.
              </p>
            </div>

            <label
              htmlFor="image-upload"
              className="block rounded-2xl border border-dashed border-neutral-700 bg-neutral-900/70 p-6 text-sm text-neutral-300 hover:border-amber-400/70 transition cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                id="image-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div className="text-center">
                <span className="block font-medium text-white text-base mb-3">
                  Choose or drag an image
                </span>
                {hasFile ? (
                  <div className="space-y-1 text-left max-h-40 overflow-y-auto">
                    <div className="text-xs text-amber-400 font-medium truncate">
                      {uploadedFile.name} •{" "}
                      {(uploadedFile.size / (1024 * 1024)).toFixed(1)}MB
                    </div>
                    <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-800 mt-2">
                      Ready to process
                    </div>
                  </div>
                ) : (
                  <span className="block text-xs text-neutral-500">
                    PNG, JPEG, WEBP, BMP up to 50MB
                  </span>
                )}
              </div>
            </label>

            <button
              type="button"
              onClick={removeBackground}
              disabled={loading || !hasFile}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Processing..." : "Remove Background"}
            </button>

            <div className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
              <p className="text-xs text-neutral-400">{status}</p>
              {progress && <p className="text-xs text-amber-400">{progress}</p>}
              {error && <p className="text-xs text-red-400">{error}</p>}
              <p className="text-[10px] text-neutral-600">
                ✦ Runs 100% in your browser — images never leave your device
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={downloadImage}
                disabled={!processedImageUrl}
                className="rounded-xl border border-amber-400/50 bg-amber-500/10 px-4 py-3 font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 font-semibold text-neutral-200 transition hover:bg-neutral-800"
              >
                Reset
              </button>
            </div>
          </aside>

          <main className="border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg md:text-2xl font-semibold">Preview</h2>
                <p className="text-sm text-neutral-400">
                  {originalImageUrl
                    ? "Original vs Processed"
                    : "Upload an image to see preview"}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-4xl">
                {!originalImageUrl ? (
                  <div className="flex items-center justify-center border border-dashed border-neutral-700 bg-black/30 rounded-lg h-96 text-center text-neutral-500">
                    Upload an image to see the preview here
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-neutral-300">
                        Background Removed{" "}
                        {processedImageUrl ? "✓" : "(Processing...)"}
                      </h3>
                      {/* Checkerboard background to show transparency */}
                      <div
                        className="border border-neutral-700 rounded-lg overflow-hidden"
                        style={{
                          backgroundImage:
                            "linear-gradient(45deg,#333 25%,transparent 25%),linear-gradient(-45deg,#333 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#333 75%),linear-gradient(-45deg,transparent 75%,#333 75%)",
                          backgroundSize: "20px 20px",
                          backgroundPosition: "0 0,0 10px,10px -10px,-10px 0",
                          backgroundColor: "#1a1a1a",
                        }}
                      >
                        {processedImageUrl ? (
                          <img
                            src={processedImageUrl}
                            alt="Background removed"
                            className="w-full h-auto max-h-96 object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-96 text-neutral-500">
                            {loading
                              ? "Processing in browser..."
                              : "Click 'Remove Background' to process"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
