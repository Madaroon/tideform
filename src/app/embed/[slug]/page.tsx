import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { THEMES } from "@/lib/types";
import FormRenderer from "@/components/preview/FormRenderer";

interface PageProps {
  params: { slug: string };
}

async function getForm(slug: string) {
  const form = await db.form.findUnique({
    where: { slug },
    include: { fields: { orderBy: { position: "asc" } } },
  });

  if (!form || form.status !== "published") return null;

  return {
    ...form,
    settings: JSON.parse(form.settings as string),
    fields: form.fields.map((f) => ({
      ...f,
      options: JSON.parse(f.options as string),
      validation: JSON.parse(f.validation as string),
      settings: JSON.parse(f.settings as string),
    })),
  };
}

export default async function EmbedPage({ params }: PageProps) {
  const form = await getForm(params.slug);
  if (!form) notFound();

  const theme = THEMES[form.theme as keyof typeof THEMES] || THEMES.midnight;

  return (
    <div
      style={{
        minHeight: "auto",
        background: theme.bg,
        color: theme.text,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        width: "100%",
      }}
    >
      <FormRenderer form={form} theme={theme} showBranding={false} variant="embed" />
    </div>
  );
}

