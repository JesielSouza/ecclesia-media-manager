import type { Metadata } from "next";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";

import { AppClerkProvider } from "@/modules/auth/components/clerk-provider";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Ecclesia Media Manager",
  description:
    "Plataforma multi-tenant para coordenar escalas, checklists e operacao de ministerios de midia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${headingFont.variable} ${bodyFont.variable} font-[family-name:var(--font-body)]`}
      >
        <AppClerkProvider>{children}</AppClerkProvider>
      </body>
    </html>
  );
}
