import type { Metadata } from "next";
import Link from "next/link";

import "@/app/globals.css";
import { Nav } from "@/components/layout/nav";

export const metadata: Metadata = {
  title: "ClipLab",
  description: "ClipLab",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                CL
              </div>
              <p className="text-sm font-semibold text-foreground">ClipLab</p>
            </Link>
            <Nav />
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
