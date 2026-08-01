import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
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
          Riverside Ward
        </div>
      </div>
    ),
    { ...size }
  );
}
