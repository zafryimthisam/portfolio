import { Metadata } from "next";
import { getServerSession } from "@/lib/actions/get-session";
import WorksPageClient from "./WorksPageClient";

export const metadata: Metadata = {
  title: "Projects & Works by Zafry Imthisam - From Idea to Code",
  description: "Explore Zafry Imthisam's portfolio of projects including Better Auth authentication, Prisma ORM databases, GSAP animations, and full-stack web applications.",
  keywords: [
    "Zafry Imthisam projects",
    "full stack projects",
    "better auth demo",
    "prisma orm",
    "postgresql database",
    "gsap animations",
    "react projects",
    "nextjs portfolio",
    "web development projects",
    "developer portfolio",
  ],
  openGraph: {
    title: "Projects & Works - Zafry Imthisam",
    description: "From idea to code: Explore innovative projects showcasing modern web technologies and development skills.",
    siteName: "Zafry.dev",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Projects & Works by Zafry Imthisam",
    description: "Discover full-stack projects featuring Better Auth, Prisma, GSAP, and more modern web technologies.",
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

export default async function WorksPage() {
  const session = await getServerSession();

  return <WorksPageClient session={session} />;
}
