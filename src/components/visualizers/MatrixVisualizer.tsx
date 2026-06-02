import { AnimatePresence, motion } from "framer-motion";
import type { VisualMatrixCell } from "../../types";

interface MatrixVisualizerProps {
  rows: number;
  cols: number;
  cells: VisualMatrixCell[];
  rowHeaders?: string[];
  colHeaders?: string[];
  width: number;
  height: number;
}

const statusStyles: Record<string, { bg: string; border: string; text: string }> = {
  default: {
    bg: "var(--surface)",
    border: "var(--border)",
    text: "var(--text)",
  },
  active: {
    bg: "var(--primary)",
    border: "var(--primary)",
    text: "#fff",
  },
  highlighted: {
    bg: "var(--warning)",
    border: "var(--warning)",
    text: "#fff",
  },
  computed: {
    bg: "var(--tint-success)",
    border: "var(--success)",
    text: "var(--success)",
  },
  backtrack: {
    bg: "var(--tint-accent)",
    border: "var(--accent)",
    text: "var(--accent)",
  },
};

export default function MatrixVisualizer({
  rows,
  cols,
  cells,
  rowHeaders,
  colHeaders,
  width,
  height,
}: MatrixVisualizerProps) {
  if (rows === 0 || cols === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height, color: "var(--text-muted)" }}
      >
        暂无数据
      </div>
    );
  }

  const headerW = 48;
  const headerH = 32;
  const availW = width - headerW - 8;
  const availH = height - headerH - 8;

  const cellW = Math.min(52, Math.max(28, availW / cols));
  const cellH = Math.min(36, Math.max(24, availH / rows));
  const totalW = cols * cellW;
  const totalH = rows * cellH;
  const offsetX = headerW + Math.max(0, (availW - totalW) / 2);
  const offsetY = headerH + Math.max(0, (availH - totalH) / 2);

  const cellMap = new Map<string, VisualMatrixCell>();
  for (const c of cells) {
    cellMap.set(`${c.row}-${c.col}`, c);
  }

  return (
    <div className="relative" style={{ width, height, overflow: "auto" }}>
      {/* Column headers */}
      {colHeaders &&
        colHeaders.slice(0, cols).map((h, j) => (
          <div
            key={`ch-${j}`}
            className="absolute flex items-center justify-center text-xs font-medium"
            style={{
              left: offsetX + j * cellW,
              top: offsetY - headerH + 4,
              width: cellW - 2,
              height: headerH - 4,
              color: "var(--text-muted)",
            }}
          >
            {h}
          </div>
        ))}

      {/* Row headers */}
      {rowHeaders &&
        rowHeaders.slice(0, rows).map((h, i) => (
          <div
            key={`rh-${i}`}
            className="absolute flex items-center justify-center text-xs font-medium"
            style={{
              left: offsetX - headerW + 4,
              top: offsetY + i * cellH,
              width: headerW - 4,
              height: cellH - 2,
              color: "var(--text-muted)",
            }}
          >
            {h}
          </div>
        ))}

      {/* Cells */}
      <AnimatePresence>
        {cells.map((cell) => {
          const style = statusStyles[cell.status] || statusStyles.default;
          const x = offsetX + cell.col * cellW;
          const y = offsetY + cell.row * cellH;
          const fontSize = cellW < 36 ? 10 : 12;

          return (
            <motion.div
              key={cell.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: cell.status === "active" || cell.status === "highlighted" ? 1.12 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="absolute flex items-center justify-center rounded font-mono font-semibold"
              style={{
                left: x + 1,
                top: y + 1,
                width: cellW - 2,
                height: cellH - 2,
                background: style.bg,
                border: `1.5px solid ${style.border}`,
                color: style.text,
                fontSize,
                zIndex: cell.status === "active" || cell.status === "highlighted" ? 10 : 1,
              }}
            >
              {cell.value}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
