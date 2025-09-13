import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/src/components/providers/SessionProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CalConnect - Smart Calendar Scheduling",
  description: "Streamline meeting coordination with AI-powered suggestions and visual calendar overlays.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
