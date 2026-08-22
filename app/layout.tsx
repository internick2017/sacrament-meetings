import type { Metadata } from 'next';
import { Lora } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getBaseUrl } from '@/lib/get-base-url';
import { I18nProvider } from '@/lib/i18n/client';
import { getLocale, getT } from '@/lib/i18n/server';
import './globals.css';

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
});

// Title and description follow the chosen language, so a shared link previews
// in the same language the visitor was browsing in.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    metadataBase: new URL(getBaseUrl()),
    title: t('home.heading'),
    description: t('home.subheading'),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={lora.variable}>
      <body className="min-h-screen bg-white text-slate-900">
        <I18nProvider locale={locale}>
          <Header />
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
