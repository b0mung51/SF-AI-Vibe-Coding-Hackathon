import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@calcom/atoms/globals.min.css";
import { AuthProvider } from "./contexts/AuthContext";
import CalProviderWrapper from "./contexts/CalProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cal Connect",
  description: "Pick a time in seconds. Effortless two-person scheduling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CalProviderWrapper>
            {children}
          </CalProviderWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
