import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { submissionSchema } from "@/lib/validations";
import { validateSubmission } from "@/lib/utils";

// POST /api/submissions — Create submission (public, no auth required)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formSlug, ...rest } = body;

    if (!formSlug) {
      return NextResponse.json({ error: "Form slug required" }, { status: 400 });
    }

    const parsed = submissionSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Find form
    const form = await db.form.findUnique({
      where: { slug: formSlug },
      include: { fields: { orderBy: { position: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if (form.status !== "published") {
      return NextResponse.json(
        { error: "This form is not accepting responses" },
        { status: 403 }
      );
    }

    // Validate submission data against form fields
    const fields = form.fields.map((f) => ({
      id: f.id,
      type: f.type,
      required: f.required,
      options: JSON.parse(f.options as string),
    }));

    const validation = validateSubmission(fields, parsed.data.data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: validation.errors },
        { status: 400 }
      );
    }

    // Create submission
    const submission = await db.submission.create({
      data: {
        formId: form.id,
        data: JSON.stringify(parsed.data.data),
        metadata: JSON.stringify(parsed.data.metadata || {}),
        status: "complete",
        completedAt: new Date(),
      },
    });

    // TODO: Send webhook if configured
    // TODO: Send email notification if configured

    return NextResponse.json(
      { submission: { id: submission.id } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create submission error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/submissions?formId=xxx — List submissions for a form (auth required)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const formId = searchParams.get("formId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!formId) {
      return NextResponse.json({ error: "formId required" }, { status: 400 });
    }

    // Verify form ownership
    const form = await db.form.findFirst({
      where: { id: formId, userId: session.user.id },
      include: { fields: { orderBy: { position: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const [submissions, total] = await Promise.all([
      db.submission.findMany({
        where: { formId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.submission.count({ where: { formId } }),
    ]);

    // Parse JSON data
    const parsed = submissions.map((s) => ({
      ...s,
      data: JSON.parse(s.data as string),
      metadata: JSON.parse(s.metadata as string),
    }));

    return NextResponse.json({
      submissions: parsed,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      fields: form.fields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        options: JSON.parse(f.options as string),
      })),
    });
  } catch (error) {
    console.error("List submissions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
