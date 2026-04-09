import { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Zafry Imthisam - Full Stack Developer & Computer Science Student",
  description:
    "Portfolio of Zafry Imthisam, a Computer Science undergraduate at SLIIT with hands-on experience in full-stack web applications. Seeking internship opportunities.",
  keywords: [
    "Zafry Imthisam",
    "full stack developer",
    "computer science student",
    "SLIIT",
    "web development",
    "react developer",
    "nextjs portfolio",
    "typescript",
    "javascript",
    "prisma",
    "gsap",
    "tailwindcss",
    "portfolio",
    "developer portfolio",
  ],
  openGraph: {
    title: "Zafry Imthisam - Full Stack Developer & Computer Science Student",
    description:
      "Explore the portfolio of Zafry Imthisam, showcasing full-stack web development projects and creative tools.",
    siteName: "Zafry.dev",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zafry Imthisam - Full Stack Developer",
    description:
      "Portfolio showcasing full-stack projects and creative tools by Zafry Imthisam.",
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

export default function Home() {
  return <HomeClient />;
}
