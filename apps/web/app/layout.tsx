import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chess Online - Play Chess with Friends",
  description: "Play chess online with friends in real-time with voice chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
