import { rembg } from "@remove-background-ai/rembg.js";
import { NextRequest } from "next/server";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return Response.json(
        { error: "No image file provided" },
        { status: 400 },
      );
    }

    // Get format from form data, default to webp
    const format = (formData.get("format") as string) || "webp";
    if (!["webp", "png"].includes(format)) {
      return Response.json(
        { error: "Invalid format. Must be webp or png" },
        { status: 400 },
      );
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const apiKey = process.env.REMBG_API_KEY;
    if (!apiKey) {
      console.error("REMBG_API_KEY not configured");
      return Response.json(
        { error: "Background removal service not configured" },
        { status: 500 },
      );
    }

    // Call rembg API
    const { outputImagePath, cleanup } = await rembg({
      apiKey,
      inputImage: buffer,
      options: {
        format: format as "webp" | "png",
      },
    });

    // Read the output file
    if (!outputImagePath) {
      throw new Error("Background removal failed: no output path returned");
    }

    const outputBuffer = fs.readFileSync(outputImagePath);

    // Clean up the temp file
    if (cleanup) {
      cleanup();
    }

    // Return the processed image
    const contentType = format === "webp" ? "image/webp" : "image/png";
    return new Response(outputBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="background-removed.${format}"`,
      },
    });
  } catch (error) {
    console.error("Background removal error:", error);
    return Response.json(
      { error: "Failed to remove background. Please try again." },
      { status: 500 },
    );
  }
}
