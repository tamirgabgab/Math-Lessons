import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";

/**
 * Plain shape descriptions (Excalidraw "skeletons"). The generators only build these,
 * so they stay pure and testable; ../probability/materialize.ts turns them into real elements.
 */
export type Skeleton = ExcalidrawElementSkeleton;

/** How a text is placed relative to its (x, y): vertically always centred. */
export type Anchor = "center" | "left" | "right";

export const COLORS = {
  ink: "#1e1e1e",
  muted: "#495057",
  prob: "#1971c2",
  result: "#2b8a3e",
  header: "#f1f3f5",
  grid: "#868e96",
  sets: ["#1971c2", "#e03131", "#2f9e44"],
};

export function text(
  x: number,
  y: number,
  value: string,
  { size = 20, color = COLORS.ink, anchor = "center" as Anchor } = {},
): Skeleton {
  return {
    type: "text",
    x,
    y,
    text: value,
    fontSize: size,
    strokeColor: color,
    textAlign: anchor === "center" ? "center" : anchor,
    customData: { anchor },
  };
}

export function line(x1: number, y1: number, x2: number, y2: number, { color = COLORS.ink, width = 2 } = {}): Skeleton {
  return {
    type: "line",
    x: x1,
    y: y1,
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ] as never,
    strokeColor: color,
    strokeWidth: width,
    roughness: 0,
  };
}

export function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  { stroke = COLORS.grid, fill = "transparent", strokeWidth = 1 } = {},
): Skeleton {
  return {
    type: "rectangle",
    x,
    y,
    width,
    height,
    strokeColor: stroke,
    backgroundColor: fill,
    fillStyle: "solid",
    strokeWidth,
    roughness: 0,
    roundness: null,
  };
}

export function circle(cx: number, cy: number, r: number, { stroke = COLORS.ink, strokeWidth = 2 } = {}): Skeleton {
  return {
    type: "ellipse",
    x: cx - r,
    y: cy - r,
    width: 2 * r,
    height: 2 * r,
    strokeColor: stroke,
    backgroundColor: "transparent",
    strokeWidth,
    roughness: 0,
  };
}

export function dot(cx: number, cy: number, r = 4, color = COLORS.ink): Skeleton {
  return {
    type: "ellipse",
    x: cx - r,
    y: cy - r,
    width: 2 * r,
    height: 2 * r,
    strokeColor: color,
    backgroundColor: color,
    fillStyle: "solid",
    strokeWidth: 1,
    roughness: 0,
  };
}

/** Rough on-canvas width of a label, used to leave room for it in layouts. */
export const estimateTextWidth = (value: string, size = 20) => value.length * size * 0.55;
