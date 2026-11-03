import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feature Flags with Kameleoon",
  description:
    "Kameleoon feature flags and experiments in a Next.js 16 app on Vercel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <span className="font-semibold">feature-flag-kameleoon</span>
            <a
              className="text-sm text-zinc-500 hover:text-zinc-900"
              href="https://github.com/Kameleoon-new/vercel-starter-kit"
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
      </body>
    </html>
  );
}
