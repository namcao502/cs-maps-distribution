import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NotificationProvider } from "@/lib/auth/notification-context";
import { ToastContainer } from "@/components/layout/ToastContainer";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CS 1.6 Maps",
  description: "Browse and install Counter-Strike 1.6 maps",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} style={{ backgroundColor: '#232e4a', colorScheme: 'dark' }}>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#232e4a', color: '#e2e8f0' }}>
        <NotificationProvider>
          {children}
          <ToastContainer />
        </NotificationProvider>
      </body>
    </html>
  );
}
