import { ImageResponse } from 'next/og';
import { getUnit } from '@/lib/unit-db';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// This file has no request-scoped locale (share-link previews are generated
// by crawlers, not a signed-in visitor with a locale cookie), so the
// fallback below is hardcoded English rather than pulled from a dictionary
// via getT() — the same neutral idea as header.unnamedUnit, just not
// translated here.
const UNNAMED_UNIT_FALLBACK = 'Our unit';

export default async function OpengraphImage() {
  // getUnit() uses @neondatabase/serverless, which is fetch-based and works
  // in both the Node.js and Edge runtimes this file can run under, so it can
  // be awaited directly here. It already falls back to EMPTY_UNIT (name: '')
  // rather than throwing if the query fails, so this can't 500 the preview.
  const unit = await getUnit();
  const wardName = unit.name || UNNAMED_UNIT_FALLBACK;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e293b',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 96, marginBottom: 24 }}>⛪</div>
        <div style={{ fontSize: 64, fontWeight: 700 }}>Sacrament Meeting Planner</div>
        <div style={{ fontSize: 32, fontWeight: 400, color: '#cbd5e1', marginTop: 12 }}>
          {wardName}
        </div>
      </div>
    ),
    { ...size }
  );
}
