import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI App',
  description: 'AI-powered application built with AutoDevStack',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
