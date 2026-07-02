import type { Metadata, Viewport } from "next";
import { ClerkProvider, Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import VisitorTracker from "./visitor-tracker";
import { AccountMenu } from "./account-menu";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "mySwamp",
  title: "mySwamp",
  description: "dump your tasks. get your frog.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "mySwamp",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#07100b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
 <ClerkProvider
  appearance={{
    variables: {
      colorPrimary: '#8fa66c',
      colorBackground: '#0b1710',
      colorForeground: '#c8d8b8',
      colorNeutral: '#8fa66c',
      colorPrimaryForeground: '#07100b',
      colorInput: '#09140d',
      colorInputForeground: '#c8d8b8',
      colorMuted: '#102117',
      colorMutedForeground: '#8fa080',
      colorBorder: '#29422f',
      colorRing: '#8fa66c',
      colorShimmer: 'rgba(143, 166, 108, 0.28)',
      borderRadius: '0.85rem',
    },
    elements: {
      cardBox: { boxShadow: 'none' },
      card: { border: '1px solid #29422f', boxShadow: 'none' },
      formButtonPrimary: {
        backgroundColor: '#8fa66c',
        color: '#07100b',
        boxShadow: 'none',
      },
      socialButtonsBlockButton: {
        borderColor: '#29422f',
        color: '#c8d8b8',
        boxShadow: 'none',
      },
      footerActionLink: { color: '#9fb77b' },
      footer: { background: '#09140d' },
    },
  }}
 >
  <html
    lang="en"
    className="h-full antialiased"
  >
    <body>
      <header className="fixed top-0 right-0 z-50 flex justify-end items-center p-4 gap-4 h-16">
        <Show when="signed-out">
          <SignInButton>
            <button data-analytics="auth-sign-in" className="h-10 px-3 rounded-full text-sm text-[#c8d8b8] cursor-pointer transition-colors duration-200 hover:bg-[#17251b] hover:text-[#d6e3ca]">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton>
            <button data-analytics="auth-sign-up" className="bg-[#8fa66c] text-[#0a1710] rounded-full font-medium text-sm h-10 px-4 cursor-pointer transition-all duration-200 hover:bg-[#b2c791] hover:scale-[1.03] active:scale-95">
              Sign up
            </button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <AccountMenu />
        </Show>
      </header>

      {children}
      <VisitorTracker />
      <Analytics />
    </body>
  </html>
</ClerkProvider>
  );
}
