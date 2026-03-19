import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { THEMES } from "@/lib/types";
import FormRenderer from "@/components/preview/FormRenderer";

interface PageProps {
  params: { slug: string };
}

// Fetch form data at the server level
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

// SEO metadata
export async function generateMetadata({ params }: PageProps) {
  const form = await getForm(params.slug);
  if (!form) return { title: "Form not found" };

  return {
    title: form.title,
    description: form.description || `Fill out ${form.title} on Tideform`,
    robots: { index: false }, // Don't index form pages
  };
}

export default async function PublicFormPage({ params }: PageProps) {
  const form = await getForm(params.slug);
  if (!form) notFound();

  const theme = THEMES[form.theme as keyof typeof THEMES] || THEMES.midnight;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FormRenderer form={form} theme={theme} />
    </div>
  );
}
