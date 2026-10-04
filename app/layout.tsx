import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ViewProvider } from "@/components/navigation/ViewContext";
import { Header } from "@/components/Header";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  fallback: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "serif"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  fallback: [
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: "Perspectra: a wider view of every decision",
  description:
    "Describe a decision and your reasoning. Perspectra shows the assumptions and open questions in your thinking, in your own words, and never decides for you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${fraunces.variable} ${inter.variable}`}
    >
      <body className="min-h-full flex flex-col bg-[#faf8f5] text-[#18263e]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#18263e] focus:text-[#faf8f5] focus:rounded-md focus:shadow-md focus:ring-2 focus:ring-[#b46b19]"
        >
          Skip to content
        </a>

        <AuthProvider>
          <ViewProvider>
            <Header />

            <main id="main-content" className="flex-1 w-full mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-8 flex flex-col justify-center">
              {children}
            </main>
          </ViewProvider>
        </AuthProvider>

        {/* Compact Single-line Footer */}
        <footer className="w-full border-t border-[#dbd4c7] py-3 px-4 sm:px-6 bg-[#faf8f5]/80 text-center text-[15px] text-[#6c7c94]">
          <p>
            Perspectra is for reflection, not professional advice. Nothing is saved unless you sign in and choose Save.
          </p>
        </footer>
      </body>
    </html>
  );
}
