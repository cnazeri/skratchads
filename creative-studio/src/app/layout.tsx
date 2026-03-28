import type { Metadata } from "next";
import "./globals.css";
import { NavWrapper } from "@/components/NavWrapper";

export const metadata: Metadata = {
  title: "SkratchAds\u2122 Banner Buddy",
  description: "AI-Powered Banner Creation Tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-slate-100" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <NavWrapper>{children}</NavWrapper>
      </body>
    </html>
  );
}
