import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ShareRoom - 4-Digit Code Text, Code & File Sharing',
  description: 'Join room using a 4-digit code. Share formatted code with 1-click copy, text notes, and files (max 10MB) stored on Vercel Blob with 10-day auto erasure.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen font-sans">{children}</body>
    </html>
  );
}
