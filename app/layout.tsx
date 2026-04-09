import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavBar from "@/components/web/NavBar";
import { Toaster } from "sonner";
import { TanstackProvider } from "@/components/providers/tanstack-provider";

export const metadata: Metadata = {
  title: "Zafry.dev - Portfolio & Creative Tools",
  description:
    "Portfolio of Zafry Imthisam, a Computer Science undergraduate specializing in full-stack web development. Explore projects, creative tools, and connect.",
  keywords: [
    "portfolio",
    "developer",
    "full stack developer",
    "computer science student",
    "web development",
    "react",
    "nextjs",
    "typescript",
    "tailwindcss",
    "prisma",
    "better auth",
    "gsap",
    "creative tools",
    "collage maker",
    "background remover",
    "image editing",
    "AI tools",
  ],
  authors: [{ name: "Zafry Imthisam" }],
  creator: "Zafry Imthisam",
  publisher: "Zafry Imthisam",
  openGraph: {
    title: "Zafry.dev - Portfolio & Creative Tools",
    description:
      "Portfolio of Zafry Imthisam, a Computer Science undergraduate. Explore full-stack projects, creative AI tools, and connect.",
    siteName: "Zafry.dev",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zafry.dev - Portfolio & Creative Tools",
    description:
      "Portfolio of Zafry Imthisam, a Computer Science undergraduate. Explore projects and creative tools.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-mono dark">
      <body className="min-h-dvh flex md:flex-col flex-col ">
        <TanstackProvider>
          <TooltipProvider>
            <NavBar />
            <main className="flex-1 flex flex-col">
              {children}
              <Toaster />
            </main>
          </TooltipProvider>
        </TanstackProvider>
      </body>
    </html>
  );
}
