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
        <NavWrapper>{children}</NavWrapper>
      </body>
    </html>
  );
}
