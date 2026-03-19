import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync } from "fs";
import path from "path";

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".csv":
      return "text/csv";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const safeName = path.basename(params.filename);
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const filePath = path.join(uploadsDir, safeName);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const contentType = getContentType(safeName);
  const stream = createReadStream(filePath);

  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}

