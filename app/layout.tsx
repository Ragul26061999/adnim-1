import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import AuthGuard from "./components/AuthGuard";
import { AuthProvider } from "./contexts/AuthContext";

export const metadata: Metadata = {
  title: "Edueron - School Management System",
  description: "Comprehensive school management and learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
