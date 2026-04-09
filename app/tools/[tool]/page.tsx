import { Metadata } from "next";
import CollageMaker from "@/components/web/CollageMaker";
import ImageBackgroundRemover from "@/components/web/ImageBackgroundRemover";

interface ToolPageProps {
  params: Promise<{ tool: string }>;
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { tool } = await params;

  const toolConfigs = {
    collagemaker: {
      title: "Collage Maker - Create Beautiful Photo Collages Online | Zafry.dev",
      description: "Create stunning photo collages with drag & drop functionality, custom layouts, and professional export quality. Free online collage maker tool.",
      keywords: [
        "collage maker",
        "photo collage",
        "online collage maker",
        "free collage maker",
        "drag and drop collage",
        "photo editor",
        "image collage",
        "custom layouts",
        "professional collage",
      ],
      openGraphTitle: "Collage Maker - Beautiful Photo Collages",
      openGraphDescription: "Create professional photo collages with ease. Drag & drop photos, choose layouts, and export high-quality images.",
    },
    "background-remover": {
      title: "Background Remover - Remove Image Backgrounds with AI | Zafry.dev",
      description: "Remove backgrounds from images using advanced AI technology. Upload any photo and get a clean cutout with transparent background instantly.",
      keywords: [
        "background remover",
        "remove background",
        "AI background removal",
        "transparent background",
        "image cutout",
        "photo editor",
        "background eraser",
        "image processing",
      ],
      openGraphTitle: "AI Background Remover - Instant Results",
      openGraphDescription: "Advanced AI-powered background removal tool. Upload images and get professional-quality cutouts with transparent backgrounds.",
    },
  };

  const config = toolConfigs[tool as keyof typeof toolConfigs] || {
    title: `${tool} Tool | Zafry.dev`,
    description: `Use the ${tool} tool on Zafry.dev - Creative tools for developers and designers.`,
    keywords: [tool, "tool", "creative tool", "developer tool"],
    openGraphTitle: `${tool} Tool`,
    openGraphDescription: `Explore the ${tool} tool - Part of Zafry.dev's creative toolkit.`,
  };

  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    openGraph: {
      title: config.openGraphTitle,
      description: config.openGraphDescription,
      siteName: "Zafry.dev",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: config.openGraphTitle,
      description: config.openGraphDescription,
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
}

export default async function ToolIdPage({ params }: ToolPageProps) {
  const { tool } = await params;

  return (
    <div className="p-3 bg-neutral-950 flex-1 text-white">
      {tool === "collagemaker" && <CollageMaker />}
      {tool === "background-remover" && <ImageBackgroundRemover />}
    </div>
  );
}
