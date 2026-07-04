import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import VisitorTracker from "./visitor-tracker";
import { AuthShell } from "./auth-shell";
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
    icon: "/icon.svg",
    apple: "/icon.svg",
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
    <html lang="en" className="h-full antialiased">
      <body>
        <ClerkProvider
          localization={{
            dividerText: 'or',
            socialButtonsBlockButton: 'continue with {{provider|titleize}}',
            formFieldLabel__emailAddress: 'email address',
            formFieldLabel__password: 'password',
            formFieldInputPlaceholder__emailAddress: 'your email address',
            formFieldInputPlaceholder__password: 'your password',
            formFieldInputPlaceholder__signUpPassword: 'make a password',
            formButtonPrimary: 'continue',
            signIn: {
              start: {
                title: 'return to the swamp',
                subtitle: 'let the water remember your frogs.',
                actionText: 'new here?',
                actionLink: 'sign up',
              },
              password: {
                title: 'return to the swamp',
                subtitle: 'one quiet step back in.',
                actionLink: 'use another way',
              },
            },
            signUp: {
              start: {
                title: 'enter the swamp',
                subtitle: 'make a place for your frogs to return to.',
                actionText: 'already here?',
                actionLink: 'sign in',
              },
              continue: {
                title: 'enter the swamp',
                subtitle: 'one more mark in the water.',
                actionText: 'already here?',
                actionLink: 'sign in',
              },
            },
          }}
          appearance={{
            variables: {
              fontFamily: 'Oranienbaum, ui-serif, Georgia, serif',
              colorPrimary: 'rgba(242, 225, 196, 0.82)',
              colorBackground: '#0b1710',
              colorForeground: 'rgba(242, 225, 196, 0.82)',
              colorNeutral: 'rgba(242, 225, 196, 0.62)',
              colorPrimaryForeground: '#07100b',
              colorInput: '#09140d',
              colorInputForeground: 'rgba(242, 225, 196, 0.82)',
              colorMuted: '#102117',
              colorMutedForeground: 'rgba(242, 225, 196, 0.5)',
              colorBorder: 'rgba(242, 225, 196, 0.34)',
              colorRing: 'rgba(242, 225, 196, 0.58)',
              colorShimmer: 'rgba(242, 225, 196, 0.24)',
              borderRadius: '0',
            },
            elements: {
              avatarBox: {
                background: '#182015',
                color: 'transparent',
              },
              cardBox: { boxShadow: 'none', background: 'transparent' },
              card: {
                border: '0',
                background: 'transparent',
                boxShadow: 'none',
                
                 
              },
              formButtonPrimary: {
                backgroundColor: 'transparent',
                color: 'rgba(242, 225, 196, 0.82)',
                border: '1px solid rgba(242, 225, 196, 0.46)',
                borderRadius: '0',
                boxShadow: 'none',
              },
              socialButtonsBlockButton: {
                borderColor: 'rgba(242, 225, 196, 0.34)',
                borderRadius: '0',
                color: 'rgba(242, 225, 196, 0.78)',
                boxShadow: 'none',
              },
              footerActionLink: { color: 'rgba(242, 225, 196, 0.8)' },
              footer: { background: 'transparent' },
            },
          }}
        >
          <AuthShell />

          <div className="water-glints global-water-glints" aria-hidden="true">
            {Array.from({ length: 96 }).map((_, index) => <span key={index} />)}
          </div>

          {children}
          <VisitorTracker />
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
