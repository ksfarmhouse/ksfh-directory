import type { Metadata } from "next";
import "./globals.css";

import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Kansas State FarmHouse Directory",
  description:
    "Private member and alumni directory for the Kansas State Chapter of FarmHouse Fraternity.",
  icons: {
    icon: "/fh-shield.png",
    shortcut: "/fh-shield.png",
    apple: "/fh-shield.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
