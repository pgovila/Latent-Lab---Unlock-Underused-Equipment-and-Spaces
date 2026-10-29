import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LatentLab | Research Lab & Equipment Sharing Network (by Team Analytical Eye)',
  description:
    'Institutional resource sharing network for Universities & Labs featuring hybrid sponsored credits, verifiable safety badges, digital condition check-in/out, and immutable auditable ledgers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
