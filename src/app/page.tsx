import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-primary)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-tide-400 rounded-md flex items-center justify-center font-display font-bold text-sm text-[var(--surface-0)]">
            T
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">tideform</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-semibold bg-tide-400 text-[var(--surface-0)] rounded-lg hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] text-xs font-medium text-tide-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-tide-400 animate-pulse" />
          Open Source · Self-Hosted · AI-Native
        </div>

        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          Beautiful forms,
          <br />
          <span className="text-tide-400">built in seconds.</span>
        </h1>

        <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
          The open-source, AI-powered form builder that respects your data.
          Describe what you need — Tideform builds it. Self-host it anywhere.
          No subscriptions. No data harvesting. Just forms.
        </p>

        <div className="flex items-center justify-center gap-4 mb-16">
          <Link
            href="/signup"
            className="px-6 py-3 text-sm font-semibold bg-tide-400 text-[var(--surface-0)] rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Building — Free
          </Link>
          <a
            href="https://github.com/tideform/tideform"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 text-sm font-medium border border-[var(--border)] rounded-lg hover:border-tide-400 hover:text-tide-400 transition-colors"
          >
            ★ Star on GitHub
          </a>
        </div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
          {[
            {
              title: "AI-Powered",
              desc: "Describe your form in plain English. Tideform generates fields, labels, and validation instantly.",
              icon: "✦",
            },
            {
              title: "Privacy-First",
              desc: "Self-host on your own server. Your data never leaves your infrastructure. GDPR-ready by default.",
              icon: "🔒",
            },
            {
              title: "Beautiful UX",
              desc: "Conversational, one-question-at-a-time experience. 6 themes. RTL support. Mobile-perfect.",
              icon: "◈",
            },
            {
              title: "Developer API",
              desc: "Full REST API. Webhooks on submission. Embed anywhere. Integrate with any stack.",
              icon: "⟨/⟩",
            },
            {
              title: "Analytics Built-In",
              desc: "Completion rates, NPS, field-level stats, response timelines. No third-party analytics needed.",
              icon: "📊",
            },
            {
              title: "Open Source",
              desc: "MIT licensed. Inspect every line. Contribute, fork, extend. No vendor lock-in, ever.",
              icon: "⬡",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] hover:border-tide-400/40 transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Docker Quick Start */}
        <div className="mt-20 max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
            Deploy in 30 seconds
          </p>
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 text-left font-mono text-sm">
            <span className="text-[var(--text-muted)]">$</span>{" "}
            <span className="text-tide-400">docker run</span>{" "}
            <span className="text-[var(--text-primary)]">-p 3000:3000 tideform/tideform</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 text-center text-xs text-[var(--text-muted)]">
        <p>
          Tideform is open source software under the MIT license.{" "}
          <a href="https://github.com/tideform/tideform" className="text-tide-400 hover:underline">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
