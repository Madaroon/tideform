import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 16);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "jpg",
  "jpeg",
  "png",
  "csv",
]);

function getExtension(filename: string): string | null {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) return null;
  return filename.slice(idx + 1).toLowerCase();
}

function sanitizeFilename(name: string): string {
  // Remove any path segments and keep a conservative character set.
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function getUploadsDir() {
  // Project root is the current working directory for `next dev` in this repo.
  const dir = path.resolve(process.cwd(), "uploads");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Max is 10MB." },
        { status: 400 }
      );
    }

    const originalName = file.name || "upload";
    const ext = getExtension(originalName);
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Unsupported file type." },
        { status: 400 }
      );
    }

    const uploadsDir = await getUploadsDir();

    // Store under a unique filename to avoid collisions.
    const safeOriginal = sanitizeFilename(originalName);
    const storeName = `${nanoid()}-${safeOriginal}`;
    const storePath = path.join(uploadsDir, storeName);

    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storePath, bytes);

    return NextResponse.json({
      filename: storeName,
      path: `/api/uploads/${storeName}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

