import { AnimatePresence, motion } from "framer-motion";
import type { VisualArrayItem } from "../../types";

interface MultiArrayVisualizerProps {
  arrays: VisualArrayItem[][];
  labels: string[];
  width: number;
  height: number;
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
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
  removed: {
    bg: "var(--error)",
    border: "var(--error)",
    text: "#fff",
  },
};

export default function MultiArrayVisualizer({
  arrays,
  labels,
  width,
  height,
}: MultiArrayVisualizerProps) {
  if (arrays.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height, color: "var(--text-muted)" }}
      >
        暂无数据
      </div>
    );
  }

  const rowCount = arrays.length;
  const rowHeight = Math.min(120, (height - 20) / rowCount);
  const labelWidth = 80;

  return (
    <div className="flex flex-col gap-2" style={{ width, height, overflow: "auto" }}>
      {arrays.map((items, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-2"
          style={{ height: rowHeight, minHeight: 60 }}
        >
          <div
            className="shrink-0 text-xs font-medium text-right"
            style={{ width: labelWidth, color: "var(--text-muted)" }}
          >
            {labels[rowIdx] || `数组${rowIdx}`}
          </div>
          <div className="relative flex-1" style={{ height: rowHeight - 8 }}>
            <ArrayRow items={items} maxWidth={width - labelWidth - 16} height={rowHeight - 8} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArrayRow({ items, maxWidth, height }: { items: VisualArrayItem[]; maxWidth: number; height: number }) {
  if (items.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs"
        style={{ width: maxWidth, height, color: "var(--text-muted)" }}
      >
        空
      </div>
    );
  }

  const itemWidth = Math.min(48, (maxWidth - 8) / Math.max(items.length, 1));
  const itemHeight = Math.min(40, height - 4);
  const startX = (maxWidth - items.length * itemWidth) / 2;
  const centerY = height / 2 - itemHeight / 2;

  return (
    <div className="relative" style={{ width: maxWidth, height }}>
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const colors = statusColors[item.status] || statusColors.default;
          const x = startX + index * itemWidth;

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: centerY - 10 }}
              animate={{ opacity: 1, y: centerY }}
              exit={{ opacity: 0, y: centerY + 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute flex flex-col items-center justify-center rounded font-mono"
              style={{
                left: x,
                width: itemWidth - 2,
                height: itemHeight,
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                color: colors.text,
              }}
            >
              <span className="text-xs font-semibold">{item.value}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
