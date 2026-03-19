import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiGenerateSchema } from "@/lib/validations";
import { generateFormWithAI } from "@/lib/ai";

// POST /api/ai/generate — Generate form fields from description
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = aiGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await generateFormWithAI(
      parsed.data.prompt,
      process.env.ANTHROPIC_API_KEY
    );

    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI generate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
