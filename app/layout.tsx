import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hegg skole FAU veileder",
  description: "Foreldreveileder for trygg og balansert skjermbruk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
