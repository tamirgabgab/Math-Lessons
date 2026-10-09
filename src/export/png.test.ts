import { describe, expect, it } from "vitest";
import { pngSize } from "./png";

// 3×2 transparent PNG
const PNG_3x2 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAADklEQVR42mNgQAKMDAwAAA8AAZ+Gf+0AAAAASUVORK5CYII=";

describe("pngSize", () => {
  it("reads width and height from the PNG header", () => {
    expect(pngSize(PNG_3x2)).toEqual({ width: 3, height: 2 });
  });

  it("returns null for non-PNG data", () => {
    expect(pngSize("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBeNull();
    expect(pngSize("garbage")).toBeNull();
  });
});
