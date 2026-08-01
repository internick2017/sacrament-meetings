import type { Metadata } from 'next';
import { Lora } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getBaseUrl } from '@/lib/get-base-url';
import './globals.css';

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
});

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: 'Sacrament Meeting Planner',
  description: 'Plan, manage, and print sacrament meeting programs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lora.variable}>
      <body className="min-h-screen bg-white text-slate-900">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
