import { NextRequest, NextResponse } from "next/server";
import { getFileStream, getFileMetadata } from "@/utils/googleDrive";
import { Readable } from "stream";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await params;

  try {
    console.log(`MM8_STREAMING_DRIVE_FILE: ${fileId}`);
    const metadata = await getFileMetadata(fileId);
    const stream = await getFileStream(fileId);

    // Use native Node.js helper to convert to web stream
    const webStream = Readable.toWeb(stream as any);

    return new NextResponse(webStream as any, {
      headers: {
        "Content-Type": metadata.mimeType || "application/octet-stream",
        "Content-Length": metadata.size || "",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("MM8_DRIVE_STREAM_ROUTE_ERROR:", error.message, error.stack);
    return NextResponse.json({ 
      error: "Failed to stream file",
      details: error.message 
    }, { status: 500 });
  }
}
