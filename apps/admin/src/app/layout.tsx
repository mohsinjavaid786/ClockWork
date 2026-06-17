import type { Metadata } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

// Inter is the UI workhorse; Newsreader is the editorial serif reserved for
// large section headings (26px+). Geist Mono stays for tabular/data readouts.
const ui = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-ui' });
const display = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Clockwork',
  description: 'Internal time tracking and productivity management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${display.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
