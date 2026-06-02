import { AnimatePresence, motion } from "framer-motion";
import type { VisualArrayItem } from "../../types";

interface ArrayVisualizerProps {
  items: VisualArrayItem[];
  mode: "stack" | "array" | "queue";
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

export default function ArrayVisualizer({
  items,
  mode,
  width,
  height,
}: ArrayVisualizerProps) {
  if (items.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height, color: "var(--text-muted)" }}
      >
        暂无数据，请运行代码
      </div>
    );
  }

  if (mode === "stack") {
    return <StackView items={items} width={width} height={height} />;
  }

  if (mode === "queue") {
    return <QueueView items={items} width={width} height={height} />;
  }

  return <ArrayView items={items} width={width} height={height} />;
}

function StackView({
  items,
  width,
  height,
}: {
  items: VisualArrayItem[];
  width: number;
  height: number;
}) {
  const itemHeight = Math.min(48, (height - 60) / Math.max(items.length, 1));
  const itemWidth = Math.min(200, width * 0.6);
  const startY = height - 30;

  return (
    <div className="relative" style={{ width, height }}>
      {/* 栈底标识 */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-xs"
        style={{ bottom: 4, color: "var(--text-muted)" }}
      >
        栈底
      </div>

      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const colors = statusColors[item.status] || statusColors.default;
          const isTop = index === items.length - 1;
          const y = startY - (index + 1) * itemHeight;

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: y + 20, scale: 0.8 }}
              animate={{ opacity: 1, y, scale: 1 }}
              exit={{ opacity: 0, x: isTop ? -80 : 80, scale: 0.5 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-lg font-mono text-base font-semibold"
              style={{
                width: itemWidth,
                height: itemHeight - 4,
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                color: colors.text,
                boxShadow: isTop
                  ? `0 0 12px ${colors.border}40`
                  : "none",
              }}
            >
              {item.value}
              {isTop && (
                <span
                  className="absolute -right-14 text-xs font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  TOP
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 栈顶标识 */}
      {items.length > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-xs"
          style={{
            top: startY - items.length * itemHeight - 16,
            color: "var(--primary)",
          }}
        >
          栈顶
        </div>
      )}
    </div>
  );
}

function ArrayView({
  items,
  width,
  height,
}: {
  items: VisualArrayItem[];
  width: number;
  height: number;
}) {
  const n = items.length;
  const colWidth = Math.min(80, (width - 24) / Math.max(n, 1));
  const innerW = Math.max(14, colWidth - 8);

  // 直方图数值范围（仅对数值生效）
  const nums = items.map((it) => (typeof it.value === "number" ? it.value : 0));
  const maxVal = Math.max(...nums, 1);
  const base = Math.min(0, ...nums);

  const cellH = Math.min(40, Math.max(26, innerW));
  const labelH = 14;
  const chartTop = 14;
  const chartH = Math.max(36, height - cellH - labelH - chartTop - 18);

  const startX = (width - n * colWidth) / 2;

  return (
    <div className="relative" style={{ width, height }}>
      {/* 直方图基线 */}
      <div
        className="absolute"
        style={{
          left: 8,
          right: 8,
          top: chartTop + chartH,
          height: 1,
          background: "var(--border)",
        }}
      />

      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const colors = statusColors[item.status] || statusColors.default;
          const x = startX + index * colWidth;
          const val = typeof item.value === "number" ? item.value : 0;
          const ratio = maxVal === base ? 0 : (val - base) / (maxVal - base);
          const barH = Math.max(4, ratio * chartH * 0.85);
          const isPlain = item.status === "default";

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="absolute flex flex-col items-center"
              style={{ left: x, top: chartTop, width: innerW }}
            >
              {/* 直方图柱（高度随数值，颜色随状态） */}
              <div
                className="flex items-end justify-center w-full"
                style={{ height: chartH }}
              >
                <motion.div
                  layout
                  className="rounded-t-md"
                  animate={{ height: barH }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  style={{
                    width: innerW,
                    background: isPlain ? "var(--primary)" : colors.bg,
                    opacity: isPlain ? 0.4 : 1,
                    border: `1.5px solid ${isPlain ? "var(--primary)" : colors.border}`,
                  }}
                />
              </div>

              {/* 数字表格格子 */}
              <div
                className="rounded-md flex items-center justify-center font-mono font-semibold mt-1.5"
                style={{
                  width: innerW,
                  height: cellH,
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                  color: colors.text,
                  fontSize: innerW < 28 ? 11 : 14,
                }}
              >
                {item.value}
              </div>

              {/* 下标 */}
              <span
                className="mt-0.5"
                style={{ fontSize: 10, color: "var(--text-muted)", height: labelH }}
              >
                [{index}]
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function QueueView({
  items,
  width,
  height,
}: {
  items: VisualArrayItem[];
  width: number;
  height: number;
}) {
  const itemWidth = Math.min(64, (width - 40) / Math.max(items.length, 1));
  const itemHeight = Math.min(56, height * 0.35);
  const startX = (width - items.length * itemWidth) / 2;
  const centerY = height / 2 - itemHeight / 2;

  return (
    <div className="relative" style={{ width, height }}>
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const colors = statusColors[item.status] || statusColors.default;
          const isFront = index === 0;
          const isRear = index === items.length - 1 && items.length > 1;
          const x = startX + index * itemWidth;

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: centerY - 20 }}
              animate={{ opacity: 1, y: centerY }}
              exit={{ opacity: 0, x: isFront ? -80 : 80, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute flex flex-col items-center justify-center rounded-lg font-mono"
              style={{
                left: x,
                width: itemWidth - 4,
                height: itemHeight,
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                color: colors.text,
                boxShadow: isFront
                  ? `0 0 12px ${colors.border}40`
                  : "none",
              }}
            >
              <span className="text-base font-semibold">{item.value}</span>
              {isFront && (
                <span className="absolute -top-5 text-xs font-normal" style={{ color: "var(--primary)" }}>
                  FRONT
                </span>
              )}
              {isRear && (
                <span className="absolute -bottom-5 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                  REAR
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div
        className="absolute text-xs flex items-center gap-1"
        style={{ left: Math.max(4, startX - 30), top: centerY + itemHeight / 2 - 8, color: "var(--text-muted)" }}
      >
        <span>←</span> 出队
      </div>
      <div
        className="absolute text-xs flex items-center gap-1"
        style={{ right: 4, top: centerY + itemHeight / 2 - 8, color: "var(--text-muted)" }}
      >
        入队 <span>→</span>
      </div>
    </div>
  );
}
