"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FormSummary {
  id: string;
  slug: string;
  title: string;
  status: string;
  updatedAt: string;
  _count: { submissions: number };
  fields: { id: string }[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/forms")
        .then((r) => r.json())
        .then((d) => { setForms(d.forms || []); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [status]);

  async function createForm() {
    setCreating(true);
    try {
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Form", fields: [] }),
      });
      const data = await res.json();
      if (data.form) {
        router.push(`/builder/${data.form.id}`);
      }
    } catch {
      alert("Failed to create form");
    }
    setCreating(false);
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center">
        <div className="text-[var(--text-muted)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      {/* Top Bar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-tide-400 rounded-md flex items-center justify-center font-display font-bold text-xs text-[var(--surface-0)]">T</div>
          <span className="font-display text-lg font-semibold tracking-tight">tideform</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--text-muted)]">{session?.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl font-semibold">Your Forms</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {forms.length} form{forms.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={createForm}
            disabled={creating}
            className="px-4 py-2 text-sm font-semibold bg-tide-400 text-[var(--surface-0)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creating ? "Creating..." : "+ New Form"}
          </button>
        </div>

        {forms.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[var(--border)] rounded-xl">
            <div className="text-4xl opacity-20 mb-3">◇</div>
            <p className="text-[var(--text-muted)] text-sm mb-1">No forms yet</p>
            <p className="text-[var(--text-muted)] text-xs opacity-60">
              Create your first form to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {forms.map((form) => (
              <Link
                key={form.id}
                href={`/builder/${form.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] hover:border-tide-400/40 transition-colors group"
              >
                <div>
                  <h3 className="text-sm font-medium group-hover:text-tide-400 transition-colors">
                    {form.title || "Untitled Form"}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--text-muted)]">
                      {form.fields.length} field{form.fields.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">·</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {form._count.submissions} response{form._count.submissions !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">·</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(form.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                    form.status === "published"
                      ? "bg-green-500/10 text-green-400"
                      : form.status === "closed"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                  }`}>
                    {form.status}
                  </span>
                  <span className="text-[var(--text-muted)] text-lg group-hover:text-tide-400 transition-colors">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
