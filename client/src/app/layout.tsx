import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { TeamProvider } from "@/lib/team";
import { ProjectProvider } from "@/lib/project";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EnvMate - Secure Environment Variable Management",
  description: "Securely store, share, and manage your environment variables with encryption, access control, and team collaboration.",
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
          <TeamProvider>
            <ProjectProvider>
              {children}
            </ProjectProvider>
          </TeamProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
