import { circle, COLORS, rect, text, type Skeleton } from "./shapes";

export type VennRegion = "A" | "B" | "C" | "AB" | "AC" | "BC" | "ABC" | "out";

export interface VennConfig {
  sets: 2 | 3;
  /** Set names, e.g. ["A", "B", "C"]. */
  labels: string[];
  /** Value written inside each region (only for "A" — the part of A alone, "AB" — A∩B only, …). */
  regions: Partial<Record<VennRegion, string>>;
  universe: boolean;
  universeLabel: string;
}

export const VENN_REGIONS: Record<2 | 3, VennRegion[]> = {
  2: ["A", "AB", "B", "out"],
  3: ["A", "B", "C", "AB", "AC", "BC", "ABC", "out"],
};

const R = 120;

/** Circle centres and the point where each region's value is written. */
function geometry(sets: 2 | 3) {
  if (sets === 2) {
    const d = 75;
    return {
      centres: [
        { x: -d, y: 0 },
        { x: d, y: 0 },
      ],
      regions: { A: { x: -d - 55, y: 0 }, B: { x: d + 55, y: 0 }, AB: { x: 0, y: 0 } } as Partial<Record<VennRegion, { x: number; y: number }>>,
    };
  }
  const centres = [
    { x: -70, y: -40 },
    { x: 70, y: -40 },
    { x: 0, y: 80 },
  ];
  return {
    centres,
    regions: {
      A: { x: -118, y: -75 },
      B: { x: 118, y: -75 },
      C: { x: 0, y: 140 },
      AB: { x: 0, y: -95 },
      AC: { x: -68, y: 50 },
      BC: { x: 68, y: 50 },
      ABC: { x: 0, y: 0 },
    } as Partial<Record<VennRegion, { x: number; y: number }>>,
  };
}

export function buildVenn(config: VennConfig): Skeleton[] {
  const { sets, labels, regions, universe, universeLabel } = config;
  const geo = geometry(sets);
  const out: Skeleton[] = [];

  const minX = Math.min(...geo.centres.map((c) => c.x)) - R;
  const maxX = Math.max(...geo.centres.map((c) => c.x)) + R;
  const minY = Math.min(...geo.centres.map((c) => c.y)) - R;
  const maxY = Math.max(...geo.centres.map((c) => c.y)) + R;

  if (universe) {
    const pad = 50;
    out.push(rect(minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad, { stroke: COLORS.ink, strokeWidth: 2 }));
    if (universeLabel.trim()) {
      out.push(text(maxX + pad - 24, minY - pad + 22, universeLabel.trim(), { size: 24 }));
    }
    const outside = regions.out?.trim();
    if (outside) out.push(text(minX - pad + 30, maxY + pad - 24, outside, { size: 20 }));
  }

  geo.centres.forEach((c, i) => {
    const color = COLORS.sets[i];
    out.push(circle(c.x, c.y, R, { stroke: color, strokeWidth: 2 }));
    const name = labels[i]?.trim();
    if (name) {
      // name outside the circle, away from the other circles
      const dir = sets === 3 && i === 2 ? { x: 0, y: 1 } : { x: i === 0 ? -1 : 1, y: -1 };
      const len = Math.hypot(dir.x, dir.y);
      out.push(
        text(c.x + (dir.x / len) * (R + 22), c.y + (dir.y / len) * (R + 22), name, { size: 24, color }),
      );
    }
  });

  for (const region of VENN_REGIONS[sets]) {
    if (region === "out") continue;
    const value = regions[region]?.trim();
    const at = geo.regions[region];
    if (value && at) out.push(text(at.x, at.y, value, { size: 20 }));
  }
  return out;
}
