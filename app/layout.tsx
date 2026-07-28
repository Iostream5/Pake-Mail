import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono", // Keeping the variable name same so we don't break existing tailwind classes using this variable
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pake Mail",
    template: "%s | Pake Mail",
  },
  description: "Platform Manajemen Pengiriman Lamaran Kerja via Email",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${jetBrainsMono.variable} h-full`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-obsidian-canvas text-bone antialiased">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
