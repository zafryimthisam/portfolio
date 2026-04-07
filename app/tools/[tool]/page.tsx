import CollageMaker from "@/components/web/CollageMaker";
import ImageBackgroundRemover from "@/components/web/ImageBackgroundRemover";

interface ToolPageProps {
  params: Promise<{ tool: string }>;
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
