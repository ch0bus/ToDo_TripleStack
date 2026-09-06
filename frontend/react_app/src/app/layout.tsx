"use client";

import { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-slate-900 text-slate-50">
        {children}
      </body>
    </html>
  );
}
