import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architektur Kosmos',
  description: 'A radial architecture atlas for time, style, theory, place, and relation.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: [{ url: '/icon.svg', type: 'image/svg+xml' }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
