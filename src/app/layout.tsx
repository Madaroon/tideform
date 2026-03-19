import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Tideform", template: "%s · Tideform" },
  description: "Open-source, AI-native form builder. Privacy-first alternative to Typeform.",
  keywords: ["forms", "survey", "open source", "typeform alternative", "ai", "self-hosted"],
  openGraph: {
    title: "Tideform",
    description: "Open-source, AI-native form builder.",
    siteName: "Tideform",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
