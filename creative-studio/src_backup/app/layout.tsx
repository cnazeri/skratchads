import type { Metadata } from "next";
import "./globals.css";
import { NavWrapper } from "@/components/NavWrapper";

export const metadata: Metadata = {
  title: "SkratchAds Banner Buddy",
  description: "AI-Powered Banner Creation Tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-100">
        <NavWrapper>{children}</NavWrapper>
      </body>
    </html>
  );
}
