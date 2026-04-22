import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tandem by Moortgat",
  description: "Suivi collaboratif de formation N / N+1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
