import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: '두근두근 연구실',
  description: '페르마와 함께하는 수학 연구실',
  icons: {
    icon: '/assets/images/fermat-profile.png',
    apple: '/assets/images/fermat-profile.png',
  },
  openGraph: {
    title: '두근두근 연구실',
    description: '페르마와 함께하는 수학 연구실',
    images: ['/assets/images/bg-fermat-ball.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="app-layout">
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
