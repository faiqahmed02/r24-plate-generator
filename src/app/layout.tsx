import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R24 Plate Generator",
  description: "Configurable plate generator with realistic scaling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-dvh bg-neutral-50 text-neutral-900"
      >
        {children}
      </body>
    </html>
  );
}
