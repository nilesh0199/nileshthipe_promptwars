import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Second Look — We help you think. We don't decide for you.",
  description:
    "An exploratory thinking tool to examine cognitive blind spots, unstated assumptions, and overlooked factors in your decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#fbf9f5] text-[#18263e]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#18263e] focus:text-[#fbf9f5] focus:rounded-md focus:shadow-md focus:ring-2 focus:ring-[#b46b19]"
        >
          Skip to content
        </a>

        <header className="w-full border-b border-[#dbd4c7] bg-[#fbf9f5]/90 backdrop-blur-xs sticky top-0 z-30">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#18263e]">
                Second Look
              </span>
              <span className="text-xs sm:text-sm text-[#4e5e77] sm:border-l sm:border-[#dbd4c7] sm:pl-3">
                We help you think. We don&apos;t decide for you.
              </span>
            </div>
            <button
              type="button"
              className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-medium text-[#18263e] bg-transparent border border-[#dbd4c7] rounded-md hover:bg-[#f4efe6] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e]"
              aria-label="Log in or Sign up (Coming soon)"
            >
              Log in / Sign up
            </button>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-14">
          {children}
        </main>

        <footer className="w-full border-t border-[#dbd4c7] py-6 px-4 sm:px-6 bg-[#fbf9f5] text-center text-xs text-[#6c7c94] space-y-1">
          <p>Nothing is saved unless you choose to sign in and save.</p>
          <p>For reflection, not professional advice.</p>
        </footer>
      </body>
    </html>
  );
}
