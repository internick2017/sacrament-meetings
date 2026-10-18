'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n/client';
import { whatsappUrl } from '@/lib/interview-message';

// The wa.me link carries the phone number, so it is built here, in the
// browser of whoever taps it, and never rendered into server HTML, put in a
// query string of this site, or logged. Without a usable phone the button is
// hidden and the text stays available to copy by hand.
export default function WhatsappButton({ phone, message }: { phone: string | null; message: string }) {
  const t = useT();
  // Remembers WHAT was copied, so editing the form clears the "Copied" note.
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const url = whatsappUrl(phone, message);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedText(message);
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the text is
      // still on screen to select by hand.
      setCopiedText(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{message}</p>
      <div className="flex flex-wrap items-center gap-2">
        {url ? (
          <button
            type="button"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            {t('interviews.whatsapp.open')}
          </button>
        ) : (
          <p className="text-sm text-amber-800">{t('interviews.whatsapp.noPhone')}</p>
        )}
        <button
          type="button"
          onClick={copy}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('interviews.whatsapp.copy')}
        </button>
        <span aria-live="polite" className="text-sm text-slate-500">
          {copiedText === message ? t('interviews.whatsapp.copied') : ''}
        </span>
      </div>
    </div>
  );
}
