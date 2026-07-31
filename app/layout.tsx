import type { Metadata } from 'next';
import '../styles/index.css';
import '../styles/App.css';
import '../styles/RedesignedApp.css';

export const metadata: Metadata = {
  title: 'StyleSphere Vendor Nexus',
  description: 'Enterprise Vendor Compliance & Management Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
