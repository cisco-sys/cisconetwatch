import React from 'react';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'CiscoNetWatch — Real-Time Cisco Network Monitoring',
  description:
    'Monitor Cisco devices in real-time via SNMP, NETCONF, SSH, and RESTCONF. AI-powered incident correlation for NOC teams.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} dark`}>
      <body className={ibmPlexSans.className}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            },
          }}
        />
</body>
    </html>
  );
}
