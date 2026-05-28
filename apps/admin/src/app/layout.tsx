import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrackDesk Admin',
  description: 'Time tracking admin portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
