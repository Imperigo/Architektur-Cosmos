import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architecture Cosmos',
  description: 'A radial architecture atlas for time, style, theory, place, and relation.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
