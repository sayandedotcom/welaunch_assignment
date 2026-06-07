import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./components/providers/AppProviders";

export const metadata: Metadata = {
  title: "AI Chat - Multi-Workspace",
  description: "AI Chat with cross-chat contextual awareness",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
