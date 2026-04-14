import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Find free tools like image background remover, collage maker and more AI tools",
  keywords: [
    "image background remover",
    "free online image background remover",
    "remove background for free",
    "collage maker",
    "free collage maker",
    "collage maker online",
    "collage maker tool",
    "collage maker",
    "remove bg",
    "ai tools",
    "ai background remover",
  ],
  openGraph: {
    title: "AI tools",
    description:
      "Find free tools like image background remover, collage maker and more AI tools",
    siteName: "Zafry.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Tools",
    description: "Find AI tools, editors and more",
    creator: "@ZafryImthisam",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function ToolsPage() {
  return (
    <div className=" bg-neutral-950 text-white pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
            Tools
          </h1>
          <p className="mt-3 text-base md:text-xl text-neutral-400">
            Powerful creative tools built for speed and quality
          </p>
        </div>

        {/* Tools Grid - Centered and narrower on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-6 justify-items-center">
          {/* Collage Maker Card */}
          <Link
            href="/tools/collagemaker"
            className="group block w-full max-w-[340px] md:max-w-none bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="h-44 md:h-60 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 flex items-center justify-center relative overflow-hidden">
              <div className="text-7xl md:text-[110px] opacity-10 group-hover:opacity-20 transition-opacity">
                🖼️
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(at_center,#ffffff10_0%,transparent_70%)]" />
            </div>

            <div className="p-5 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-black font-bold text-lg md:text-xl flex-shrink-0">
                  C
                </div>
                <h2 className="text-lg md:text-2xl font-semibold leading-tight">
                  Collage Maker
                </h2>
              </div>

              <p className="text-neutral-400 text-sm leading-snug line-clamp-3 md:line-clamp-none">
                Create beautiful photo collages with drag &amp; drop overlays,
                custom layouts, and professional export quality.
              </p>

              <div className="mt-5 flex items-center text-amber-400 text-sm font-medium group-hover:gap-2 transition-all">
                Open Tool
                <span className="text-lg ml-1 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </Link>

          {/* Background Remover Card */}
          <Link
            href="/tools/background-remover"
            className="group block w-full max-w-[340px] md:max-w-none bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="h-44 md:h-60 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 flex items-center justify-center relative overflow-hidden">
              <div className="text-7xl md:text-[110px] opacity-10 group-hover:opacity-20 transition-opacity">
                ✂️
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(at_center,#ffffff10_0%,transparent_70%)]" />
            </div>

            <div className="p-5 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-black font-bold text-lg md:text-xl flex-shrink-0">
                  BR
                </div>
                <h2 className="text-lg md:text-2xl font-semibold leading-tight">
                  Background Remover
                </h2>
              </div>

              <p className="text-neutral-400 text-sm leading-snug line-clamp-3 md:line-clamp-none">
                Remove backgrounds from images using AI. Upload any photo and
                get a clean cutout with transparent background.
              </p>

              <div className="mt-5 flex items-center text-amber-400 text-sm font-medium group-hover:gap-2 transition-all">
                Open Tool
                <span className="text-lg ml-1 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </Link>

          {/* Audio Trimmer Card */}
          <Link
            href="/tools/audio-trimmer"
            className="group block w-full max-w-[340px] md:max-w-none bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="h-44 md:h-60 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 flex items-center justify-center relative overflow-hidden">
              <div className="text-7xl md:text-[110px] opacity-10 group-hover:opacity-20 transition-opacity">
                🎵
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(at_center,#ffffff10_0%,transparent_70%)]" />
            </div>

            <div className="p-5 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-black font-bold text-lg md:text-xl flex-shrink-0">
                  AT
                </div>
                <h2 className="text-lg md:text-2xl font-semibold leading-tight">
                  Audio Trimmer
                </h2>
              </div>

              <p className="text-neutral-400 text-sm leading-snug line-clamp-3 md:line-clamp-none">
                Upload any audio file and trim it to your desired length—quickly
                remove unwanted parts and keep only what you need.
              </p>

              <div className="mt-5 flex items-center text-amber-400 text-sm font-medium group-hover:gap-2 transition-all">
                Open Tool
                <span className="text-lg ml-1 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </div>
          </Link>

          {/* Coming Soon Placeholder */}
          <div className="group block w-full max-w-[340px] md:max-w-none bg-neutral-900/50 border border-neutral-800/50 rounded-3xl overflow-hidden opacity-60 cursor-not-allowed">
            <div className="h-44 md:h-60 bg-neutral-800 flex items-center justify-center relative">
              <div className="text-6xl md:text-[100px] opacity-20">✨</div>
            </div>
            <div className="p-5 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-neutral-700 flex items-center justify-center text-neutral-400 text-lg md:text-xl flex-shrink-0">
                  ?
                </div>
                <h2 className="text-lg md:text-2xl font-semibold text-neutral-400">
                  Coming Soon
                </h2>
              </div>
              <p className="text-neutral-500 text-sm">
                More creative tools are on the way...
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center text-neutral-500 text-sm px-4">
          More tools will be added regularly. Stay tuned!
        </div>
      </div>
    </div>
  );
}
