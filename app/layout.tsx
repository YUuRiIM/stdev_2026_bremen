import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bremen',
  description: 'Visual novel game',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
