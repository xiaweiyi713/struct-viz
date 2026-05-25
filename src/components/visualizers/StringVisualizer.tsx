import { AnimatePresence, motion } from "framer-motion";
import type { VisualStringChar } from "../../types";

interface StringVisualizerProps {
  textChars: VisualStringChar[];
  patternChars: VisualStringChar[];
  nextArray: number[];
  textIndex: number;
  patternIndex: number;
  width: number;
  height: number;
}

const statusStyles: Record<string, { bg: string; border: string; text: string }> = {
  default: { bg: "var(--surface)", border: "var(--border)", text: "var(--text)" },
  active: { bg: "var(--primary)", border: "var(--primary)", text: "#fff" },
  matched: { bg: "var(--success)", border: "var(--success)", text: "#fff" },
  mismatched: { bg: "var(--error)", border: "var(--error)", text: "#fff" },
  highlighted: { bg: "var(--warning)", border: "var(--warning)", text: "#fff" },
};

export default function StringVisualizer({
  textChars,
  patternChars,
  nextArray,
  textIndex,
  patternIndex,
  width,
  height,
}: StringVisualizerProps) {
  if (textChars.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height, color: "var(--text-muted)" }}>
        暂无数据
      </div>
    );
  }

  const cellSize = Math.min(44, Math.max(28, (width - 40) / (textChars.length + 2)));
  const gap = 2;
  const startX = (width - textChars.length * (cellSize + gap)) / 2;

  // 匹配窗口起始位置
  const matchStart = textIndex - patternIndex;

  const patternOffsetX = matchStart * (cellSize + gap);

  // Y 布局：标签行 + 主串行 + 间隔 + 模式串行 + next数组
  const textY = 60;
  const patternY = textY + cellSize + 40;
  const nextY = patternY + cellSize + 50;

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      {/* 标题标签 */}
      <div className="absolute left-4 top-4 flex gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>主串 (text)</span>
        <span>模式串 (pattern)</span>
      </div>

      {/* 指针指示 */}
      {textIndex < textChars.length && (
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: startX + textIndex * (cellSize + gap) + cellSize / 2,
            top: textY - 20,
          }}
        >
          <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>i={textIndex}</span>
        </div>
      )}

      {/* 主串字符行 */}
      <AnimatePresence mode="popLayout">
        {textChars.map((char, i) => {
          const style = statusStyles[char.status] || statusStyles.default;
          return (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute flex flex-col items-center justify-center rounded font-mono text-sm font-bold"
              style={{
                left: startX + i * (cellSize + gap),
                top: textY,
                width: cellSize,
                height: cellSize,
                background: style.bg,
                border: `2px solid ${style.border}`,
                color: style.text,
              }}
            >
              {char.char}
              <span className="text-[9px] font-normal" style={{ color: style.text, opacity: 0.6 }}>
                {i}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 模式串指针 */}
      {patternIndex < patternChars.length && matchStart >= 0 && (
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: startX + (matchStart + patternIndex) * (cellSize + gap) + cellSize / 2,
            top: patternY - 20,
          }}
        >
          <span className="text-xs font-bold" style={{ color: "var(--success)" }}>j={patternIndex}</span>
        </div>
      )}

      {/* 模式串字符行（对齐到匹配位置） */}
      <AnimatePresence mode="popLayout">
        {patternChars.map((char, j) => {
          const style = statusStyles[char.status] || statusStyles.default;
          const x = startX + patternOffsetX + j * (cellSize + gap);
          if (x < -cellSize || x > width + cellSize) return null;

          return (
            <motion.div
              key={char.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute flex flex-col items-center justify-center rounded font-mono text-sm font-bold"
              style={{
                left: x,
                top: patternY,
                width: cellSize,
                height: cellSize,
                background: style.bg,
                border: `2px solid ${style.border}`,
                color: style.text,
              }}
            >
              {char.char}
              <span className="text-[9px] font-normal" style={{ color: style.text, opacity: 0.6 }}>
                {j}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* next 数组 */}
      {nextArray.length > 0 && (
        <div className="absolute" style={{ left: startX, top: nextY }}>
          <div className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>next 数组:</div>
          <div className="flex gap-0.5">
            {nextArray.map((val, j) => (
              <div
                key={`next-${j}`}
                className="flex flex-col items-center justify-center rounded font-mono text-xs"
                style={{
                  width: cellSize,
                  height: cellSize * 0.7,
                  background: j === patternIndex ? "var(--primary)" : "var(--surface)",
                  border: `1px solid ${j === patternIndex ? "var(--primary)" : "var(--border)"}`,
                  color: j === patternIndex ? "#fff" : "var(--text)",
                }}
              >
                <span className="font-bold">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-0.5 mt-0.5">
            {nextArray.map((_, j) => (
              <div
                key={`next-idx-${j}`}
                className="text-center font-mono text-[9px]"
                style={{ width: cellSize, color: "var(--text-muted)" }}
              >
                {j}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
