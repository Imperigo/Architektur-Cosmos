import './globals.css';
import './claude-design.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Architektur Kosmos',
  description: 'Öffentliche KosmoReferences- und KosmoAsset-Demo für Architekturprojekte, Medien, Pläne, Analyse-Layer und 3D-Preview-Modelle.',
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
