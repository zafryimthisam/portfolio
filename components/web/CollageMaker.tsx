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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import imageCompression from "browser-image-compression";

type LayoutPreset = "a4" | "story" | "post45" | "square";
type ExportFormat = "png" | "jpeg";

type CollageImage = {
  id: string;
  url: string;
  name: string;
  fileId?: string;
  filePath?: string;
};

type OverlayImage = {
  id: string;
  url: string;
  name: string;
  fileId?: string;
  filePath?: string;
  aspectRatio: number;
  x: number;
  y: number;
  w: number;
  rotation: number;
};

type SavedWorkspace = {
  images: CollageImage[];
  overlays: OverlayImage[];
  layout: LayoutPreset;
  margin: number;
  containerPadding: number;
  borderRadius: number;
  exportFormat: ExportFormat;
  maintainAspectRatio: boolean;
  bgColor: string;
  showOverlayTools: boolean;
};

type DragOverlayAction = {
  kind: "drag";
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  canvasWidth: number;
  canvasHeight: number;
};

type TransformOverlayAction = {
  kind: "transform";
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  centerClientX: number;
  centerClientY: number;
  centerXPercent: number;
  centerYPercent: number;
  startW: number;
  startRotation: number;
  startAngle: number;
  startDistance: number;
  canvasWidth: number;
  canvasHeight: number;
};

type OverlayAction = DragOverlayAction | TransformOverlayAction;

const STORAGE_KEY = "collage-maker-images-v3";
const IK_URL_ENDPOINT = "https://ik.imagekit.io/zafry";

const DEFAULT_MARGIN = 18;
const DEFAULT_CONTAINER_PADDING = 24;
const DEFAULT_BORDER_RADIUS = 12;
const DEFAULT_BG_COLOR = "#09090b";

const MIN_OVERLAY_WIDTH = 6;
const MAX_OVERLAY_WIDTH = 150; // Increased to allow larger overlays

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

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 4,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
  };

  try {
    return (await imageCompression(file, options)) as File;
  } catch (err) {
    console.error("Compression failed, using original file:", err);
    return file;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function deg(rad: number) {
  return (rad * 180) / Math.PI;
}

function normalizeRotation(angle: number) {
  const next = angle % 360;
  return next < 0 ? next + 360 : next;
}

function shortestAngleDelta(start: number, current: number) {
  let delta = current - start;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function getOverlayHeightPercent(
  overlay: OverlayImage,
  canvasRatio: number,
): number {
  return (overlay.w * canvasRatio) / overlay.aspectRatio;
}

// Updated: No longer forces position inside bounds
function clampOverlay(
  overlay: OverlayImage,
  canvasRatio: number,
): OverlayImage {
  const width = clamp(overlay.w, MIN_OVERLAY_WIDTH, MAX_OVERLAY_WIDTH);
  const height = getOverlayHeightPercent({ ...overlay, w: width }, canvasRatio);

  return {
    ...overlay,
    w: width,
    // x and y can now be negative or >100 - no clamping
  };
}

function getDefaultOverlayPlacement(aspectRatio: number, canvasRatio: number) {
  let w = 20;
  let h = (w * canvasRatio) / aspectRatio;

  if (h > 28) {
    h = 28;
    w = (h * aspectRatio) / canvasRatio;
  }

  if (w > 35) {
    w = 35;
    h = (w * canvasRatio) / aspectRatio;
  }

  if (w < 8) w = 8;

  const finalH = (w * canvasRatio) / aspectRatio;
  const x = 50 - w / 2;
  const y = 50 - finalH / 2;

  return { x, y, w };
}

async function getImageAspectRatio(file: File): Promise<number> {
  try {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(file);
      const ratio = bitmap.width / bitmap.height;
      bitmap.close?.();
      return ratio || 1;
    }
  } catch {
    // fallback below
  }

  return await new Promise<number>((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve(img.naturalWidth / img.naturalHeight || 1);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(1);
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function CollageMaker() {
  const [images, setImages] = useState<CollageImage[]>([]);
  const [overlays, setOverlays] = useState<OverlayImage[]>([]);
  const [layout, setLayout] = useState<LayoutPreset>("a4");
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [containerPadding, setContainerPadding] = useState(
    DEFAULT_CONTAINER_PADDING,
  );
  const [borderRadius, setBorderRadius] = useState(DEFAULT_BORDER_RADIUS);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [bgColor, setBgColor] = useState(DEFAULT_BG_COLOR);
  const [progress, setProgress] = useState(0);
  const [overlayProgress, setOverlayProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [overlayUploading, setOverlayUploading] = useState(false);
  const [status, setStatus] = useState("Ready to upload.");
  const [overlayStatus, setOverlayStatus] = useState("Ready to add overlays.");
  const [showOverlayTools, setShowOverlayTools] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overlayAction, setOverlayAction] = useState<OverlayAction | null>(
    null,
  );
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [overlaySelectedFiles, setOverlaySelectedFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewInnerRef = useRef<HTMLDivElement>(null);
  const overlayActionRef = useRef<OverlayAction | null>(null);
  const hydratedRef = useRef(false);

  const preset = PRESETS[layout];

  const grid = useMemo(() => {
    const count = images.length;
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count <= 4) return { cols: 2, rows: Math.ceil(count / 2) };
    if (count <= 9) return { cols: 3, rows: Math.ceil(count / 3) };
    return { cols: 4, rows: Math.ceil(count / 4) };
  }, [images.length]);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<SavedWorkspace>;

        if (Array.isArray(parsed.images)) setImages(parsed.images);
        if (Array.isArray(parsed.overlays)) setOverlays(parsed.overlays);
        if (parsed.layout) setLayout(parsed.layout);
        if (typeof parsed.margin === "number") setMargin(parsed.margin);
        if (typeof parsed.containerPadding === "number")
          setContainerPadding(parsed.containerPadding);
        if (typeof parsed.borderRadius === "number")
          setBorderRadius(parsed.borderRadius);
        if (parsed.exportFormat) setExportFormat(parsed.exportFormat);
        if (typeof parsed.maintainAspectRatio === "boolean")
          setMaintainAspectRatio(parsed.maintainAspectRatio);
        if (typeof parsed.bgColor === "string") setBgColor(parsed.bgColor);
        if (typeof parsed.showOverlayTools === "boolean")
          setShowOverlayTools(parsed.showOverlayTools);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }

    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const data: SavedWorkspace = {
      images,
      overlays,
      layout,
      margin,
      containerPadding,
      borderRadius,
      exportFormat,
      maintainAspectRatio,
      bgColor,
      showOverlayTools,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [
    images,
    overlays,
    layout,
    margin,
    containerPadding,
    borderRadius,
    exportFormat,
    maintainAspectRatio,
    bgColor,
    showOverlayTools,
  ]);

  useEffect(() => {
    overlayActionRef.current = overlayAction;
  }, [overlayAction]);

  useEffect(() => {
    if (!overlayAction) return;

    const handlePointerMove = (event: PointerEvent) => {
      const action = overlayActionRef.current;
      if (!action || event.pointerId !== action.pointerId) return;

      if (action.kind === "drag") {
        const dxPct =
          ((event.clientX - action.startClientX) / action.canvasWidth) * 100;
        const dyPct =
          ((event.clientY - action.startClientY) / action.canvasHeight) * 100;

        setOverlays((prev) =>
          prev.map((item) => {
            if (item.id !== action.id) return item;

            const nextX = action.startX + dxPct;
            const nextY = action.startY + dyPct;

            return clampOverlay({ ...item, x: nextX, y: nextY }, preset.ratio);
          }),
        );
        return;
      }

      const currentAngle = Math.atan2(
        event.clientY - action.centerClientY,
        event.clientX - action.centerClientX,
      );
      const angleDelta = shortestAngleDelta(action.startAngle, currentAngle);
      const rotation = normalizeRotation(
        action.startRotation + deg(angleDelta),
      );

      const currentDistance = Math.max(
        8,
        Math.hypot(
          event.clientX - action.centerClientX,
          event.clientY - action.centerClientY,
        ),
      );
      const scale = clamp(
        currentDistance / Math.max(24, action.startDistance),
        0.2,
        6,
      );

      setOverlays((prev) =>
        prev.map((item) => {
          if (item.id !== action.id) return item;

          const centerX = action.centerXPercent;
          const centerY = action.centerYPercent;

          const nextW = clamp(
            action.startW * scale,
            MIN_OVERLAY_WIDTH,
            MAX_OVERLAY_WIDTH,
          );
          const nextH = getOverlayHeightPercent(
            { ...item, w: nextW },
            preset.ratio,
          );

          const nextX = centerX - nextW / 2;
          const nextY = centerY - nextH / 2;

          return clampOverlay(
            {
              ...item,
              x: nextX,
              y: nextY,
              w: nextW,
              rotation,
            },
            preset.ratio,
          );
        }),
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      const action = overlayActionRef.current;
      if (!action || event.pointerId !== action.pointerId) return;
      setOverlayAction(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [overlayAction, preset.ratio]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setStatus("Select one or more images first.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus(
      `Processing & uploading ${selectedFiles.length} image${
        selectedFiles.length > 1 ? "s" : ""
      }...`,
    );

    try {
      const uploaded: CollageImage[] = [];
      const total = selectedFiles.length;

      for (let i = 0; i < selectedFiles.length; i++) {
        const originalFile = selectedFiles[i];
        const file = await compressImage(originalFile);
        const auth = await getUploadAuth();

        const response = await upload({
          file,
          fileName: originalFile.name,
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
          name: originalFile.name,
          fileId: (response as any).fileId,
          filePath: (response as any).filePath,
        });
      }

      setImages((current) => [...current, ...uploaded]);
      setProgress(100);
      setStatus(
        `Uploaded ${uploaded.length} image${
          uploaded.length > 1 ? "s" : ""
        } (optimized 🚀).`,
      );

      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleOverlayUpload = async () => {
    if (overlaySelectedFiles.length === 0) {
      setOverlayStatus("Select one or more overlay images first.");
      return;
    }

    setOverlayUploading(true);
    setOverlayProgress(0);
    setOverlayStatus(
      `Processing & adding ${overlaySelectedFiles.length} overlay image${
        overlaySelectedFiles.length > 1 ? "s" : ""
      }...`,
    );

    try {
      const added: OverlayImage[] = [];
      const total = overlaySelectedFiles.length;

      for (let i = 0; i < overlaySelectedFiles.length; i++) {
        const originalFile = overlaySelectedFiles[i];
        const aspectRatio = Math.max(
          0.1,
          await getImageAspectRatio(originalFile),
        );
        const file = await compressImage(originalFile);
        const auth = await getUploadAuth();

        const response = await upload({
          file,
          fileName: originalFile.name,
          token: auth.token,
          expire: auth.expire,
          signature: auth.signature,
          publicKey: auth.publicKey,
          onProgress: (event) => {
            const fileProgress = event.total ? event.loaded / event.total : 0;
            const overall = ((i + fileProgress) / total) * 100;
            setOverlayProgress(Math.min(100, overall));
          },
        });

        const placement = getDefaultOverlayPlacement(aspectRatio, preset.ratio);

        added.push({
          id: crypto.randomUUID(),
          url: response.url!,
          name: originalFile.name,
          fileId: (response as any).fileId,
          filePath: (response as any).filePath,
          aspectRatio,
          rotation: 0,
          ...placement,
        });
      }

      setOverlays((current) => [...current, ...added]);
      setOverlayProgress(100);
      setOverlayStatus(
        `Added ${added.length} overlay image${added.length > 1 ? "s" : ""}.`,
      );

      setOverlaySelectedFiles([]);
      if (overlayInputRef.current) overlayInputRef.current.value = "";
    } catch (error) {
      if (error instanceof ImageKitAbortError)
        setOverlayStatus("Overlay upload cancelled.");
      else if (error instanceof ImageKitInvalidRequestError)
        setOverlayStatus(`Invalid overlay upload request: ${error.message}`);
      else if (error instanceof ImageKitUploadNetworkError)
        setOverlayStatus(`Overlay network error: ${error.message}`);
      else if (error instanceof ImageKitServerError)
        setOverlayStatus(`ImageKit overlay server error: ${error.message}`);
      else setOverlayStatus("Overlay upload failed. Please try again.");
      console.error(error);
    } finally {
      setOverlayUploading(false);
    }
  };

  const removeImage = (id: string) =>
    setImages((current) => current.filter((img) => img.id !== id));

  const removeOverlay = (id: string) => {
    setOverlays((current) => current.filter((item) => item.id !== id));
    if (overlayActionRef.current?.id === id) setOverlayAction(null);
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  const clearOverlays = () => {
    setOverlays([]);
    setOverlaySelectedFiles([]);
    setOverlayProgress(0);
    setOverlayUploading(false);
    setOverlayStatus("Ready to add overlays.");
    if (overlayInputRef.current) overlayInputRef.current.value = "";
    setOverlayAction(null);
    setSelectedOverlayId(null);
  };

  const clearAll = () => {
    setImages([]);
    setOverlays([]);

    setMargin(DEFAULT_MARGIN);
    setContainerPadding(DEFAULT_CONTAINER_PADDING);
    setBorderRadius(DEFAULT_BORDER_RADIUS);
    setMaintainAspectRatio(true);
    setBgColor(DEFAULT_BG_COLOR);
    setExportFormat("png");
    setLayout("a4");
    setShowOverlayTools(false);

    setProgress(0);
    setOverlayProgress(0);
    setUploading(false);
    setOverlayUploading(false);

    setStatus("Ready to upload.");
    setOverlayStatus("Ready to add overlays.");
    setDraggedIndex(null);
    setOverlayAction(null);
    setOverlaySelectedFiles([]);
    setSelectedFiles([]);
    setSelectedOverlayId(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (overlayInputRef.current) overlayInputRef.current.value = "";
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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...images];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);

    setImages(updated);
    setDraggedIndex(null);
  };

  const handleTouchStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleTouchEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...images];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);

    setImages(updated);
    setDraggedIndex(index);
  };

  const bringOverlayToFront = (id: string) => {
    setOverlays((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx < 0) return prev;
      const arr = [...prev];
      const [item] = arr.splice(idx, 1);
      arr.push(item);
      return arr;
    });
  };

  const startOverlayAction = (
    id: string,
    mode: "drag" | "transform",
    e: ReactPointerEvent<HTMLElement>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = previewInnerRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const item = overlays.find((overlay) => overlay.id === id);
    if (!item) return;

    bringOverlayToFront(id);
    setSelectedOverlayId(id);

    const widthPx = rect.width;
    const heightPx = rect.height;

    if (mode === "drag") {
      setOverlayAction({
        kind: "drag",
        id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: item.x,
        startY: item.y,
        canvasWidth: widthPx,
        canvasHeight: heightPx,
      });

      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }

    const height = getOverlayHeightPercent(item, preset.ratio);
    const centerXPercent = item.x + item.w / 2;
    const centerYPercent = item.y + height / 2;

    const centerClientX = rect.left + (centerXPercent / 100) * widthPx;
    const centerClientY = rect.top + (centerYPercent / 100) * heightPx;

    const startAngle = Math.atan2(
      e.clientY - centerClientY,
      e.clientX - centerClientX,
    );
    const startDistance = Math.max(
      1,
      Math.hypot(e.clientX - centerClientX, e.clientY - centerClientY),
    );

    setOverlayAction({
      kind: "transform",
      id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      centerClientX,
      centerClientY,
      centerXPercent,
      centerYPercent,
      startW: item.w,
      startRotation: item.rotation,
      startAngle,
      startDistance,
      canvasWidth: widthPx,
      canvasHeight: heightPx,
    });

    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const downloadCollage = async () => {
    if (images.length === 0 || !previewRef.current) {
      setStatus("Add some images before downloading.");
      return;
    }

    setStatus("Generating optimized download...");

    try {
      const element = previewRef.current;

      const exportOptions = {
        quality: exportFormat === "png" ? 1 : 0.85,
        backgroundColor: bgColor,
        pixelRatio: 1.5,
        filter: (node: Node) => {
          if (!(node instanceof HTMLElement)) return true;

          if (node.dataset.exportIgnore === "true") return false;

          // Remove editor borders from overlays during export
          if (
            node.classList.contains("relative") &&
            node.parentElement?.classList.contains("pointer-events-auto")
          ) {
            node.style.border = "none";
            node.style.boxShadow = "none";
            node.classList.remove(
              "border-amber-400/70",
              "ring-2",
              "ring-amber-400/60",
              "border-white/10",
            );
          }

          return true;
        },
      };

      const dataUrl =
        exportFormat === "png"
          ? await toPng(element, exportOptions)
          : await toJpeg(element, exportOptions);

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      let file = new File([blob], `collage.${exportFormat}`, {
        type: blob.type,
      });

      file = await imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.85,
      });

      const compressedUrl = URL.createObjectURL(file);

      const a = document.createElement("a");
      a.href = compressedUrl;
      a.download = `collage-${layout}.${exportFormat}`;
      a.click();

      URL.revokeObjectURL(compressedUrl);

      setStatus("Downloaded optimized collage 🚀");
    } catch (err) {
      console.error(err);
      setStatus("Download failed. Please try again.");
    }
  };

  const hasSelectedFiles = selectedFiles.length > 0;
  const hasOverlaySelectedFiles = overlaySelectedFiles.length > 0;

  const previewRows = grid.rows;
  const previewCols = grid.cols;

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-mono p-3 md:p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="border border-neutral-800 bg-black/80 p-4 md:p-6 shadow-2xl shadow-black/40">
          <h1 className="text-center text-3xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent">
            Create awesome collages
          </h1>
          <p className="mt-3 text-center text-sm md:text-base text-neutral-400">
            Upload • Reorder • Overlay • Export with ImageKit
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <aside className="border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30 space-y-4">
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
                onChange={(e) =>
                  setSelectedFiles(Array.from(e.target.files ?? []))
                }
              />
              <div className="text-center">
                <span className="block font-medium text-white text-base mb-3">
                  Choose images
                </span>
                {hasSelectedFiles ? (
                  <div className="space-y-1 text-left max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
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

            <div className="space-y-2">
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

            <label className="block space-y-2 text-sm text-neutral-300">
              <div className="flex items-center justify-between">
                <span>Canvas padding</span>
                <span className="text-xs text-neutral-400">
                  {containerPadding}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                value={containerPadding}
                onChange={(e) => setContainerPadding(Number(e.target.value))}
                className="w-full"
              />
            </label>

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

            <button
              type="button"
              onClick={() => setShowOverlayTools((v) => !v)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-200 hover:bg-neutral-800 transition"
            >
              {showOverlayTools ? "Hide overlay tools" : "Show overlay tools"}
            </button>

            {showOverlayTools && (
              <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">
                    Overlay images
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {overlays.length} added
                  </span>
                </div>

                <input
                  id="overlay-upload"
                  ref={overlayInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    setOverlaySelectedFiles(
                      Array.from(e.currentTarget.files ?? []),
                    )
                  }
                />

                <label
                  htmlFor="overlay-upload"
                  className="block rounded-xl border border-dashed border-neutral-700 bg-neutral-950/70 p-4 text-center text-sm text-neutral-300 hover:border-amber-400/70 transition cursor-pointer"
                >
                  <span className="block font-medium text-white mb-2">
                    Choose overlay images
                  </span>
                  {hasOverlaySelectedFiles ? (
                    <div className="space-y-1 text-left max-h-32 overflow-y-auto">
                      {overlaySelectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="text-xs text-amber-400 font-medium truncate"
                        >
                          {file.name}
                        </div>
                      ))}
                      <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-800 mt-2">
                        {overlaySelectedFiles.length} file
                        {overlaySelectedFiles.length > 1 ? "s" : ""} selected
                      </div>
                    </div>
                  ) : (
                    <span className="block text-xs text-neutral-500">
                      These will sit on top of the collage
                    </span>
                  )}
                </label>

                <button
                  type="button"
                  onClick={handleOverlayUpload}
                  disabled={overlayUploading || !hasOverlaySelectedFiles}
                  className="w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {overlayUploading ? "Adding overlays..." : "Add overlays"}
                </button>

                <div className="space-y-2 rounded-2xl border border-neutral-800 bg-black/40 p-4">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Overlay status</span>
                    <span>{Math.round(overlayProgress)}%</span>
                  </div>
                  <progress
                    className="h-2 w-full overflow-hidden rounded-full"
                    value={overlayProgress}
                    max={100}
                  />
                  <p className="text-xs text-neutral-400">{overlayStatus}</p>
                </div>

                <button
                  type="button"
                  onClick={clearOverlays}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm font-medium text-neutral-200 hover:bg-neutral-800 transition"
                >
                  Clear overlays
                </button>

                <p className="text-xs text-neutral-500">
                  Drag the image body to move it. Use the corner handle to
                  resize and rotate together. Overlays can now go outside the
                  frame.
                </p>
              </div>
            )}

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

          <main className="border border-neutral-800 bg-black p-4 md:p-5 shadow-xl shadow-black/30">
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
                className="w-full max-w-4xl border border-neutral-800 overflow-hidden relative"
                style={{
                  aspectRatio: `${preset.width} / ${preset.height}`,
                  backgroundColor: bgColor,
                }}
              >
                <div
                  ref={previewInnerRef}
                  className="relative h-full w-full"
                  style={{
                    padding: `${containerPadding}px`,
                    boxSizing: "border-box",
                  }}
                >
                  <div className="relative h-full w-full overflow-hidden">
                    {images.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center border border-dashed border-neutral-700 bg-black/30 text-center text-neutral-500 pointer-events-none">
                        Upload images to see the collage here
                      </div>
                    ) : (
                      <div
                        className="relative z-10 grid h-full w-full"
                        style={{
                          gap: `${margin}px`,
                          padding: "0px",
                          gridTemplateColumns: `repeat(${previewCols}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${previewRows}, minmax(0, 1fr))`,
                        }}
                      >
                        {images.map((img, index) => (
                          <div
                            key={img.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(index)}
                            onTouchStart={() => handleTouchStart(index)}
                            onTouchMove={() => handleTouchEnter(index)}
                            className="group relative overflow-hidden border border-white/10 bg-white/5 shadow-inner"
                            style={{
                              borderRadius: `${borderRadius}px`,
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
                              data-export-ignore="true"
                              onPointerDown={(e) => e.stopPropagation()}
                              className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {overlays.length > 0 && (
                      <div className="absolute inset-0 z-20 pointer-events-none">
                        {overlays.map((item) => {
                          const height = getOverlayHeightPercent(
                            item,
                            preset.ratio,
                          );
                          const isSelected = selectedOverlayId === item.id;

                          return (
                            <div
                              key={item.id}
                              className="absolute pointer-events-auto select-none"
                              style={{
                                left: `${item.x}%`,
                                top: `${item.y}%`,
                                width: `${item.w}%`,
                                height: `${height}%`,
                                touchAction: "none",
                                userSelect: "none",
                              }}
                              onPointerDown={(e) =>
                                startOverlayAction(item.id, "drag", e)
                              }
                            >
                              <div
                                className={`relative h-full w-full bg-transparent ${
                                  isSelected
                                    ? "border-amber-400/70 ring-2 ring-amber-400/60"
                                    : ""
                                }`}
                                style={{
                                  borderRadius: `${borderRadius}px`,
                                  border: isSelected ? undefined : "none",
                                  boxShadow: isSelected
                                    ? "0 0 0 1px rgba(251,191,36,0.18)"
                                    : "none",
                                }}
                              >
                                <div
                                  className="absolute inset-0 overflow-hidden"
                                  style={{
                                    borderRadius: `${borderRadius}px`,
                                    transform: `rotate(${item.rotation}deg)`,
                                    transformOrigin: "center center",
                                  }}
                                >
                                  <IKImage
                                    urlEndpoint={IK_URL_ENDPOINT}
                                    src={item.filePath || item.url}
                                    alt={item.name}
                                    width={1200}
                                    height={1200}
                                    className="h-full w-full object-contain pointer-events-none select-none"
                                    style={{ backgroundColor: "transparent" }}
                                    transformation={[{ width: 1200 }]}
                                  />
                                </div>

                                <button
                                  type="button"
                                  data-export-ignore="true"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={() => removeOverlay(item.id)}
                                  className="absolute right-2 top-2 z-30 rounded-full bg-black/75 px-2 py-1 text-[10px] text-white pointer-events-auto"
                                >
                                  ✕
                                </button>

                                <button
                                  type="button"
                                  data-export-ignore="true"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    startOverlayAction(item.id, "transform", e);
                                  }}
                                  className="absolute -right-4 -bottom-4 z-30 h-11 w-11 rounded-full border border-white/80 bg-black/85 text-[11px] text-white shadow-lg pointer-events-auto cursor-nwse-resize touch-none flex items-center justify-center"
                                  title="Resize and rotate"
                                >
                                  ⤡
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {images.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-neutral-400">
                    Images • Drag order with arrows or use your mouse to
                    reposition
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      onTouchStart={() => handleTouchStart(index)}
                      onTouchMove={() => handleTouchEnter(index)}
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
