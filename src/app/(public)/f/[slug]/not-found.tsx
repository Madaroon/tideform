import Link from "next/link";

export default function FormNotFound() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-6xl opacity-20 mb-4">◇</div>
        <h1 className="font-display text-2xl font-semibold mb-2">Form not found</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          This form doesn't exist or is no longer accepting responses.
        </p>
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-lg hover:border-tide-400 hover:text-tide-400 transition-colors"
        >
          Go to Tideform
        </Link>
      </div>
    </div>
  );
}
