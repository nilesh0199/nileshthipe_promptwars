import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

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
  title: "Second Look: see your decision from where you're not standing",
  description:
    "Describe a decision and your reasoning. Second Look shows the assumptions and open questions in your thinking, in your own words.",
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

        {/* Slim App Header */}
        <header className="w-full border-b border-[#dbd4c7] bg-[#faf8f5]/90 backdrop-blur-xs sticky top-0 z-30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-md bg-[#18263e] flex items-center justify-center text-[#faf8f5] font-serif font-bold text-base shadow-2xs select-none"
                aria-hidden="true"
              >
                S
              </div>
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#18263e]">
                Second Look
              </span>
            </div>

            <button
              type="button"
              className="min-h-[44px] px-3.5 py-1.5 text-[15px] sm:text-base font-medium text-[#18263e] bg-transparent border border-[#dbd4c7] rounded-lg hover:bg-[#f3ede2] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
              aria-label="Log in or Sign up (Coming soon)"
            >
              Log in / Sign up
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-8 flex flex-col justify-center">
          {children}
        </main>

        {/* Compact Single-line Footer */}
        <footer className="w-full border-t border-[#dbd4c7] py-3 px-4 sm:px-6 bg-[#faf8f5]/80 text-center text-[15px] text-[#6c7c94]">
          <p>
            For reflection, not professional advice. Nothing is saved unless you sign in and choose Save.
          </p>
        </footer>
      </body>
    </html>
  );
}
