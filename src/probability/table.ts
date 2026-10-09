import { COLORS, estimateTextWidth, rect, text, type Skeleton } from "./shapes";
import { formatProb, parseProb, sumAll } from "./fraction";

export interface TableConfig {
  rowHeaders: string[];
  colHeaders: string[];
  /** cells[row][col] */
  cells: string[][];
  corner: string;
  /** Adds a "total" row and column, filled in automatically when the values are numbers. */
  totals: boolean;
  /** Header column on the right (Hebrew layout). */
  rtl: boolean;
}

export const TOTAL_LABEL = "סה\"כ";

/** The full grid of texts including headers and computed totals. */
export function tableGrid(config: TableConfig): string[][] {
  const { rowHeaders, colHeaders, cells, corner, totals } = config;
  const rows = rowHeaders.length;
  const cols = colHeaders.length;
  const value = (r: number, c: number) => cells[r]?.[c] ?? "";

  const grid: string[][] = [[corner, ...colHeaders, ...(totals ? [TOTAL_LABEL] : [])]];
  for (let r = 0; r < rows; r++) {
    const row = Array.from({ length: cols }, (_, c) => value(r, c));
    const sum = sumAll(row.map(parseProb));
    grid.push([rowHeaders[r], ...row, ...(totals ? [sum ? formatProb(sum) : ""] : [])]);
  }
  if (totals) {
    const colSums = Array.from({ length: cols }, (_, c) => {
      const s = sumAll(Array.from({ length: rows }, (_, r) => parseProb(value(r, c))));
      return s ? formatProb(s) : "";
    });
    const all = sumAll(cells.slice(0, rows).flatMap((row) => row.slice(0, cols)).map(parseProb));
    grid.push([TOTAL_LABEL, ...colSums, all ? formatProb(all) : ""]);
  }
  return grid;
}

const ROW_H = 46;

export function buildTable(config: TableConfig): Skeleton[] {
  const grid = tableGrid(config);
  const nCols = grid[0].length;
  const widths = Array.from({ length: nCols }, (_, c) =>
    Math.max(84, ...grid.map((row) => estimateTextWidth(row[c] ?? "", 20) + 28)),
  );
  const totalW = widths.reduce((a, b) => a + b, 0);
  const out: Skeleton[] = [];
  const hasTotals = config.totals;

  grid.forEach((row, r) => {
    let offset = 0;
    row.forEach((value, c) => {
      const w = widths[c];
      // in RTL the first (header) column is drawn on the right
      const x = config.rtl ? totalW - offset - w : offset;
      offset += w;
      const y = r * ROW_H;
      const isHeader = r === 0 || c === 0;
      const isTotal = hasTotals && (r === grid.length - 1 || c === nCols - 1);
      const fill = isHeader ? COLORS.header : isTotal ? "#f8f9fa" : "transparent";
      out.push(rect(x, y, w, ROW_H, { fill }));
      if (value) {
        out.push(
          text(x + w / 2, y + ROW_H / 2, value, {
            size: 20,
            color: isTotal && !isHeader ? COLORS.result : COLORS.ink,
          }),
        );
      }
    });
  });
  return out;
}
