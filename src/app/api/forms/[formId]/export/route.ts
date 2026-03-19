import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface Params {
  params: { formId: string };
}

// GET /api/forms/[formId]/export — Export submissions as CSV
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await db.form.findFirst({
      where: { id: params.formId, userId: session.user.id },
      include: { fields: { orderBy: { position: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const submissions = await db.submission.findMany({
      where: { formId: params.formId },
      orderBy: { createdAt: "desc" },
    });

    // Build CSV
    const fields = form.fields;
    const headers = [
      "Submission ID",
      "Submitted At",
      "Status",
      ...fields.map((f) => f.label || f.id),
    ];

    const rows = submissions.map((sub) => {
      const data = JSON.parse(sub.data as string);
      return [
        sub.id,
        new Date(sub.createdAt).toISOString(),
        sub.status,
        ...fields.map((f) => {
          const val = data[f.id];
          if (val === undefined || val === null) return "";
          if (Array.isArray(val)) return val.join("; ");
          return String(val);
        }),
      ];
    });

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${form.slug}-submissions.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function escapeCSV(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
