import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architektur-Cosmos-Browser',
  description: 'A radial zoomable architecture archive and reference atlas.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
