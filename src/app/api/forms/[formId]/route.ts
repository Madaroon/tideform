import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formUpdateSchema } from "@/lib/validations";
import { generateFieldId } from "@/lib/utils";

interface Params {
  params: { formId: string };
}

// GET /api/forms/[formId] — Get form details
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await db.form.findFirst({
      where: { id: params.formId, userId: session.user.id },
      include: {
        fields: { orderBy: { position: "asc" } },
        _count: { select: { submissions: true } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Parse JSON fields
    const parsed = {
      ...form,
      settings: JSON.parse(form.settings as string),
      fields: form.fields.map((f) => ({
        ...f,
        options: JSON.parse(f.options as string),
        validation: JSON.parse(f.validation as string),
        settings: JSON.parse(f.settings as string),
      })),
    };

    return NextResponse.json({ form: parsed });
  } catch (error) {
    console.error("Get form error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/forms/[formId] — Update form
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = formUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.form.findFirst({
      where: { id: params.formId, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const { fields, settings, ...formData } = parsed.data;

    // Update form and fields in transaction
    const form = await db.$transaction(async (tx) => {
      // Update form data
      const updated = await tx.form.update({
        where: { id: params.formId },
        data: {
          ...formData,
          ...(settings && { settings: JSON.stringify(settings) }),
          updatedAt: new Date(),
        },
      });

      // Replace fields if provided
      if (fields) {
        await tx.formField.deleteMany({ where: { formId: params.formId } });
        await tx.formField.createMany({
          data: fields.map((field, index) => ({
            id: field.id || generateFieldId(),
            formId: params.formId,
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
        });
      }

      return updated;
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error("Update form error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/forms/[formId] — Delete form
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await db.form.findFirst({
      where: { id: params.formId, userId: session.user.id },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    await db.form.delete({ where: { id: params.formId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete form error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/forms/[formId]/publish — Publish form
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    const form = await db.form.findFirst({
      where: { id: params.formId, userId: session.user.id },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "publish":
        updateData = { status: "published", publishedAt: new Date() };
        break;
      case "close":
        updateData = { status: "closed", closedAt: new Date() };
        break;
      case "draft":
        updateData = { status: "draft" };
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await db.form.update({
      where: { id: params.formId },
      data: updateData,
    });

    return NextResponse.json({ form: updated });
  } catch (error) {
    console.error("Update form status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
