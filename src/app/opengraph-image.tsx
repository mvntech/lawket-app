import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = "Lawket - The Lawyer's Pocket Buddy"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 100px',
        }}
      >
        <div
          style={{
            color: '#f59e0b',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.15em',
            marginBottom: 28,
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          LAWKET
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              display: 'flex',
            }}
          >
            {"The Lawyer's"}
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              display: 'flex',
            }}
          >
            Pocket Buddy.
          </div>
        </div>

        <div
          style={{
            color: '#71717a',
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            display: 'flex',
          }}
        >
          AI-powered case management for advocates.
        </div>

        <div
          style={{
            width: 60,
            height: 4,
            backgroundColor: '#f59e0b',
            marginTop: 48,
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size },
  )
}
