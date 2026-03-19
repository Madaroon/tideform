import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface Params {
  params: { formId: string };
}

// GET /api/forms/[formId]/embed — Returns HTML + script for embedding a form
export async function GET(req: NextRequest, { params }: Params) {
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

    const origin = new URL(req.url).origin;
    const embedDivId = `tideform-${form.slug}`;
    const iframeSrc = `${origin}/embed/${form.slug}`;

    const htmlSnippet = `<div id="${embedDivId}"></div>`;
    const scriptTag = `<script>(function(){var el=document.getElementById("${embedDivId}");if(!el)return;var iframe=document.createElement("iframe");iframe.src="${iframeSrc}";iframe.style.width="100%";iframe.style.border="0";iframe.style.minHeight="600px";iframe.loading="lazy";iframe.setAttribute("scrolling","no");el.appendChild(iframe);})();</script>`;

    return NextResponse.json({
      htmlSnippet,
      scriptTag,
    });
  } catch (error) {
    console.error("Embed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

