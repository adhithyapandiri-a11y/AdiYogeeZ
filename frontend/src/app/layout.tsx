import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RepoMind • Understand Any Codebase. Navigate Any Complexity.",
  description: "AI-powered developer platform for intelligent codebase exploration, visual architecture graphs, function relationship mapping, and open-source contribution assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var originalTitle = document.title;
                var blurMessage = "⚡ Bet that tab isn't as cool.";
                window.addEventListener("blur", function() {
                  if (document.title !== blurMessage) {
                    originalTitle = document.title;
                  }
                  document.title = blurMessage;
                });
                window.addEventListener("focus", function() {
                  if (originalTitle) {
                    document.title = originalTitle;
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#0d0d0d] text-zinc-100 selection:bg-[#f54e26]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
