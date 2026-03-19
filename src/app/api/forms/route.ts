import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formCreateSchema } from "@/lib/validations";
import { generateSlug, generateFieldId } from "@/lib/utils";

// GET /api/forms — List user's forms
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forms = await db.form.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { submissions: true } },
        fields: { orderBy: { position: "asc" }, select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ forms });
  } catch (error) {
    console.error("List forms error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/forms — Create a new form
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = formCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, theme, fields, settings } = parsed.data;
    const slug = generateSlug(title);

    const form = await db.form.create({
      data: {
        slug,
        title,
        description,
        theme,
        settings: JSON.stringify(settings),
        userId: session.user.id,
        fields: {
          create: fields.map((field, index) => ({
            id: field.id || generateFieldId(),
            type: field.type,
            label: field.label,
            description: field.description,
            placeholder: field.placeholder,
            required: field.required,
            options: JSON.stringify(field.options || []),
            validation: JSON.stringify(field.validation || {}),
            position: index,
            settings: JSON.stringify(field.settings || {}),
          })),
        },
      },
      include: {
        fields: { orderBy: { position: "asc" } },
      },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    console.error("Create form error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
