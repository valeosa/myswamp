import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "mySwamp",
  description: "dump your tasks. get your frog.",
  openGraph: {
    images: ["/og-image.png"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={mono.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
