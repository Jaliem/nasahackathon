import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

// Configure the Lora font
const quicksand = Quicksand({
  subsets: ['latin'],
  variable: '--font-lora', // Define a CSS variable for the Lora font
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Terra - Urban Planning Intelligence",
  description: "Data-driven urban planning for sustainable and climate-resilient cities using NASA Earth observation data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Apply the font's CSS variable to the html tag
    <html lang="en" className={quicksand.variable}>
      <body>{children}</body>
    </html>
  );
}