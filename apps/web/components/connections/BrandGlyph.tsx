import type { ReactNode } from 'react';

/**
 * Real brand marks for the connection providers, inlined as SVG — Lucide (the
 * app's icon set) deliberately ships no brand logos, so we carry the glyphs
 * here. Used purely to identify each real service in the consent-gated connect
 * UI (nominative use).
 *
 * Sources of the exact path data:
 *  - Google      — canonical multicolor "G" (Google sign-in mark)
 *  - Microsoft   — the four brand squares (official colors)
 *  - LinkedIn    — Font Awesome brands (fab "linkedin-in"), on the brand blue
 *  - Indeed      — Simple Icons
 *  - Monster     — Simple Icons
 *  - ZipRecruiter— not published in any open icon set (trademark), so a clean
 *                  brand-styled monogram on ZipRecruiter green stands in.
 */

const RADIUS_RATIO = 0.3;

function Badge({ bg, size, border = false, children }: { bg: string; size: number; border?: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * RADIUS_RATIO),
        background: bg,
        border: border ? '1px solid rgba(15,23,42,0.12)' : undefined,
      }}
    >
      {children}
    </span>
  );
}

export function BrandGlyph({ id, size = 40 }: { id: string; size?: number }) {
  const g = Math.round(size * 0.56);

  switch (id) {
    case 'google':
      return (
        <Badge bg="#ffffff" border size={size}>
          <svg width={g} height={g} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </Badge>
      );
    case 'microsoft':
      return (
        <Badge bg="#ffffff" border size={size}>
          <svg width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} viewBox="0 0 24 24">
            <rect x="1" y="1" width="10" height="10" fill="#F25022" />
            <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
            <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
            <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
          </svg>
        </Badge>
      );
    case 'linkedin':
    case 'linkedin-jobs':
      return (
        <Badge bg="#0A66C2" size={size}>
          <svg width={g} height={g} viewBox="0 0 448 512" fill="#ffffff">
            <path d="M100.3 448l-92.9 0 0-299.1 92.9 0 0 299.1zM53.8 108.1C24.1 108.1 0 83.5 0 53.8 0 39.5 5.7 25.9 15.8 15.8s23.8-15.8 38-15.8 27.9 5.7 38 15.8 15.8 23.8 15.8 38c0 29.7-24.1 54.3-53.8 54.3zM447.9 448l-92.7 0 0-145.6c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7l0 148.1-92.8 0 0-299.1 89.1 0 0 40.8 1.3 0c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3l0 164.3-.1 0z" />
          </svg>
        </Badge>
      );
    case 'indeed':
      return (
        <Badge bg="#2557A7" size={size}>
          <svg width={g} height={g} viewBox="0 0 24 24" fill="#ffffff">
            <path d="M11.566 21.5633v-8.762c.2553.0231.5009.0346.758.0346 1.2225 0 2.3739-.3206 3.3506-.8928v9.6182c0 .8219-.1957 1.4287-.5757 1.8338-.378.4033-.8808.6049-1.491.6049-.6007 0-1.0766-.2016-1.468-.6183-.3781-.4032-.5739-1.01-.5739-1.8184zM11.589.5659c2.5447-.8929 5.4424-.8449 7.6186.987.405.3687.8673.8334 1.0515 1.3806.2207.6913-.7695-.073-.9057-.167-.71-.4532-1.4182-.8334-2.2127-1.0946C12.8614.3873 8.8122 2.709 6.2945 6.315c-1.0516 1.5939-1.7367 3.2721-2.299 5.1174-.0614.2017-.1094.4647-.2207.6413-.1113.2036-.048-.5453-.048-.5702.0845-.7623.2438-1.4997.4414-2.237C5.3292 5.3375 7.897 2.0655 11.5891.5658zm4.9281 7.0587c0 1.6686-1.353 3.0224-3.0205 3.0224-1.6677 0-3.0186-1.3538-3.0186-3.0224 0-1.6687 1.351-3.0224 3.0186-3.0224 1.6676 0 3.0205 1.3518 3.0205 3.0224Z" />
          </svg>
        </Badge>
      );
    case 'monster':
      return (
        <Badge bg="#6C4BD8" size={size}>
          <svg width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} viewBox="0 0 24 24" fill="#ffffff">
            <path d="M0 0V24H5.42V12.39L12 18.19L18.58 12.39V24H24V0L12 11.23L0 0Z" />
          </svg>
        </Badge>
      );
    case 'ziprecruiter':
      return (
        <Badge bg="#1A9E58" size={size}>
          <span style={{ color: '#ffffff', fontWeight: 800, fontSize: Math.round(size * 0.5), lineHeight: 1, fontFamily: 'Arial, Helvetica, sans-serif' }}>Z</span>
        </Badge>
      );
    default:
      return (
        <Badge bg="#0b6b62" size={size}>
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: Math.round(size * 0.42), lineHeight: 1 }}>·</span>
        </Badge>
      );
  }
}
