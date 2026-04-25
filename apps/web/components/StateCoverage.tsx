'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology, GeometryObject } from 'topojson-specification';
import type { StatsBucketDto } from '@dxp/shared';

/**
 * Real U.S. choropleth — actual state geometry from us-atlas (Census Bureau
 * Cartographic Boundary Files via Mike Bostock's us-atlas package).
 *
 * Loads `/us-states-10m.json` once at mount, projects with Albers USA (which
 * handles Alaska and Hawaii insets automatically), and shades each state by
 * its active-job count. Click a state to filter the catalog.
 */

// FIPS state code → USPS two-letter code. The TopoJSON uses FIPS in `id`.
const FIPS_TO_USPS: Record<string, string> = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
  '11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA',
  '20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN',
  '28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM',
  '36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI',
  '45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA',
  '54':'WV','55':'WI','56':'WY',
};

interface StateProperties { name: string }

const VIEWBOX_WIDTH  = 975;
const VIEWBOX_HEIGHT = 610;

export function StateCoverage({ regions }: { regions: StatsBucketDto[] }) {
  const byCode = useMemo(() => new Map(regions.map((r) => [r.key, r.count])), [regions]);
  const [features, setFeatures] = useState<Feature<Geometry, StateProperties>[] | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Projection is built once. AlbersUsa handles AK + HI insets automatically.
  // The fitSize call rescales after the geometry loads so the map fills our
  // SVG viewport regardless of how the source data is scaled.
  const path = useMemo(() => {
    const projection = geoAlbersUsa().scale(1300).translate([VIEWBOX_WIDTH / 2, VIEWBOX_HEIGHT / 2]);
    return geoPath(projection);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/us-states-10m.json')
      .then((r) => r.json() as Promise<Topology>)
      .then((topo) => {
        if (cancelled) return;
        const collection = feature(
          topo,
          topo.objects.states as GeometryObject,
        ) as FeatureCollection<Geometry, StateProperties>;
        setFeatures(collection.features);
      })
      .catch(() => setFeatures([]));
    return () => { cancelled = true; };
  }, []);

  // Anchor color saturation at the 90th-percentile count so one outlier
  // (OH, currently) doesn't wash out the rest of the map.
  const counts = useMemo(() => {
    return Object.values(FIPS_TO_USPS)
      .map((code) => byCode.get(code) ?? 0)
      .sort((a, b) => a - b);
  }, [byCode]);
  const p90 = counts[Math.floor(counts.length * 0.9)] ?? 0;
  const anchor = Math.max(p90, 10);

  const totalStates = Object.keys(FIPS_TO_USPS).length;
  const statesWithAny = Object.values(FIPS_TO_USPS).filter((code) => (byCode.get(code) ?? 0) > 0).length;
  const percentCovered = Math.round((statesWithAny / totalStates) * 100);
  const totalJobs = regions.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-navy-900">U.S. coverage map</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Live count of active postings per state. Color shade scales with volume; click any state to filter the catalog.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight text-navy-900">
            {statesWithAny}<span className="text-slate-400"> / {totalStates}</span>
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
            {percentCovered}% with jobs
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Choropleth of active jobs by U.S. state"
        >
          {features?.map((f) => {
            const fips = String(f.id).padStart(2, '0');
            const code = FIPS_TO_USPS[fips];
            if (!code) return null; // territory or unknown — skip
            const count = byCode.get(code) ?? 0;
            const ratio = Math.min(1, count / anchor);
            const empty = count === 0;
            const fill = empty ? '#ffffff' : `rgba(15, 138, 130, ${0.18 + ratio * 0.82})`;
            const stroke = hovered === code ? '#0d6e68' : '#cbd5e1';
            const isHovered = hovered === code;
            const d = path(f);
            if (!d) return null;
            return (
              <Link
                key={code}
                href={`/jobs?region=${code}`}
                onMouseEnter={() => setHovered(code)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(code)}
                onBlur={() => setHovered(null)}
                aria-label={`${f.properties.name}: ${count.toLocaleString()} jobs`}
              >
                <path
                  d={d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isHovered ? 1.5 : 0.8}
                  strokeLinejoin="round"
                  className="cursor-pointer transition-[fill,stroke,stroke-width] duration-150 focus:outline-none"
                  style={{ filter: isHovered ? 'drop-shadow(0 2px 6px rgba(15,138,130,0.35))' : undefined }}
                >
                  <title>{f.properties.name}: {count.toLocaleString()} {count === 1 ? 'job' : 'jobs'}</title>
                </path>
              </Link>
            );
          })}

          {/* State labels (USPS code) — only on states big enough to fit */}
          {features?.map((f) => {
            const fips = String(f.id).padStart(2, '0');
            const code = FIPS_TO_USPS[fips];
            if (!code) return null;
            const centroid = path.centroid(f);
            if (!Number.isFinite(centroid[0])) return null;
            const count = byCode.get(code) ?? 0;
            const ratio = Math.min(1, count / anchor);
            const labelOnDark = !((count === 0) || ratio < 0.55);
            const bbox = path.bounds(f);
            const w = bbox[1][0] - bbox[0][0];
            const h = bbox[1][1] - bbox[0][1];
            const tooSmall = w < 28 || h < 22;
            if (tooSmall) return null;
            return (
              <text
                key={`label-${code}`}
                x={centroid[0]}
                y={centroid[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
                className={
                  'select-none text-[10px] font-bold ' +
                  (labelOnDark ? 'fill-white' : 'fill-slate-600')
                }
              >
                {code}
              </text>
            );
          })}
        </svg>

        {/* Hover panel — anchored to the corner so it never overlaps the cursor */}
        {hovered && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur">
            <p className="font-semibold text-navy-900">
              {features?.find((f) => FIPS_TO_USPS[String(f.id).padStart(2, '0')] === hovered)?.properties.name}
            </p>
            <p className="font-mono text-slate-700">
              {(byCode.get(hovered) ?? 0).toLocaleString()} active {(byCode.get(hovered) ?? 0) === 1 ? 'job' : 'jobs'}
            </p>
          </div>
        )}

        {!features && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Loading map…
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">Coverage scale</span>
          <div className="flex items-center gap-0.5">
            {[0.18, 0.4, 0.6, 0.8, 1].map((o, i) => (
              <span
                key={i}
                className="h-3 w-6 rounded border border-teal-200"
                style={{ backgroundColor: `rgba(15, 138, 130, ${o})` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-slate-500">
            0 → {Math.round(anchor).toLocaleString()}+
          </span>
        </div>
        <div>
          <strong className="font-semibold text-navy-900">{totalJobs.toLocaleString()}</strong> total
        </div>
      </div>
    </div>
  );
}
