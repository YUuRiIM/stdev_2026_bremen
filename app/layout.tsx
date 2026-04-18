import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Bremen',
  description: 'Visual novel game',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div
          className="app-layout"
          style={{
            width: '100%',
            height: '100vh',
            position: 'relative',
          }}
        >
          <header
            className="app-topbar"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
            }}
          >
            <div className="brand-group">
              <div className="brand-mark">UI</div>
              <div>
                <div className="brand-title">Game UI Lab</div>
                <div className="brand-caption">언제든 홈으로 돌아갈 수 있습니다</div>
              </div>
            </div>

            <nav className="app-topnav">
              <Link href="/" className="nav-chip">
                HOME
              </Link>
            </nav>
          </header>

          <main
            className="app-main"
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
