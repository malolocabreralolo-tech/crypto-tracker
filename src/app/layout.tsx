import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Toaster } from "sonner";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crypto Tracker",
  description: "Multi-chain crypto portfolio tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} antialiased font-mono`}>
        <LayoutShell>{children}</LayoutShell>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
