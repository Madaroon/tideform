import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface Params {
  params: { formId: string };
}

// GET /api/forms/[formId]/analytics — Get form analytics
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

    const total = submissions.length;
    const complete = submissions.filter((s) => s.status === "complete").length;
    const completionRate = total > 0 ? Math.round((complete / total) * 100) : 0;

    // Parse metadata for average duration
    const durations = submissions
      .map((s) => {
        try {
          const meta = JSON.parse(s.metadata as string);
          return meta.duration || 0;
        } catch {
          return 0;
        }
      })
      .filter((d) => d > 0);

    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    // Daily counts for last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSubs = submissions.filter(
      (s) => new Date(s.createdAt) >= sevenDaysAgo
    );

    const dailyCounts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      dailyCounts[key] = 0;
    }
    for (const sub of recentSubs) {
      const key = new Date(sub.createdAt).toISOString().split("T")[0];
      if (dailyCounts[key] !== undefined) dailyCounts[key]++;
    }

    // Field-level stats
    const fieldStats: Record<string, any> = {};
    for (const field of form.fields) {
      const parsedOptions = JSON.parse(field.options as string);
      const values: any[] = [];

      for (const sub of submissions) {
        try {
          const data = JSON.parse(sub.data as string);
          if (data[field.id] !== undefined && data[field.id] !== null && data[field.id] !== "") {
            values.push(data[field.id]);
          }
        } catch {}
      }

      const stat: any = {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        responseCount: values.length,
      };

      // Distribution for choice-based fields
      if (["select", "multi_select", "yes_no"].includes(field.type)) {
        const dist: Record<string, number> = {};
        for (const val of values) {
          if (Array.isArray(val)) {
            for (const v of val) {
              dist[v] = (dist[v] || 0) + 1;
            }
          } else {
            dist[val] = (dist[val] || 0) + 1;
          }
        }
        stat.distribution = dist;
      }

      // Average for numeric fields
      if (["rating", "scale", "number"].includes(field.type)) {
        const nums = values.map(Number).filter((n) => !isNaN(n));
        stat.average =
          nums.length > 0
            ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
            : 0;

        if (field.type === "rating") {
          const dist: Record<string, number> = {};
          for (const n of nums) dist[n] = (dist[n] || 0) + 1;
          stat.distribution = dist;
        }
      }

      fieldStats[field.id] = stat;
    }

    return NextResponse.json({
      analytics: {
        totalSubmissions: total,
        completionRate,
        avgDuration,
        submissionsToday: recentSubs.filter(
          (s) =>
            new Date(s.createdAt).toDateString() === now.toDateString()
        ).length,
        submissionsThisWeek: recentSubs.length,
        dailyCounts: Object.entries(dailyCounts).map(([date, count]) => ({
          date,
          count,
        })),
        fieldStats,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
