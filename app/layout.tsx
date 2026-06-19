import type { Metadata } from "next";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({ subsets: ["latin"] });

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
 <ClerkProvider>
  <html
    lang="en"
    className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
  >
    <body className={mono.className}>
      <header className="fixed top-0 right-0 z-50 flex justify-end items-center p-4 gap-4 h-16">
        <Show when="signed-out">
          <SignInButton>
            <button className="h-10 px-3 rounded-full text-sm text-[#dfe8d8] cursor-pointer transition-colors duration-200 hover:bg-[#17251b] hover:text-white">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="bg-[#8fa66c] text-[#0a1710] rounded-full font-medium text-sm h-10 px-4 cursor-pointer transition-all duration-200 hover:bg-[#b2c791] hover:scale-[1.03] active:scale-95">
              Sign up
            </button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <UserButton
      appearance={{
      variables: {
      colorPrimary: "#8fa66c",
    },
  }}
/>
        </Show>
      </header>

      {children}
      <Analytics />
    </body>
  </html>
</ClerkProvider>
  );
}
