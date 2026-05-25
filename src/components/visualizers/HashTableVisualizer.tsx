import { AnimatePresence, motion } from "framer-motion";
import type { VisualHashBucket } from "../../types";

interface HashTableVisualizerProps {
  buckets: VisualHashBucket[];
  tableSize: number;
  hashFunc: string;
  width: number;
  height: number;
}

const bucketStatusStyles: Record<string, { bg: string; border: string }> = {
  default: { bg: "var(--surface)", border: "var(--border)" },
  active: { bg: "var(--tint-primary)", border: "var(--primary)" },
  highlighted: { bg: "var(--tint-success)", border: "var(--success)" },
};

const entryStatusStyles: Record<string, { bg: string; border: string; text: string }> = {
  default: { bg: "var(--surface)", border: "var(--border)", text: "var(--text)" },
  active: { bg: "var(--primary)", border: "var(--primary)", text: "#fff" },
  found: { bg: "var(--success)", border: "var(--success)", text: "#fff" },
  deleted: { bg: "var(--error)", border: "var(--error)", text: "#fff" },
};

export default function HashTableVisualizer({
  buckets,
  tableSize,
  hashFunc,
  width,
  height,
}: HashTableVisualizerProps) {
  if (buckets.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width, height, color: "var(--text-muted)" }}>
        暂无数据
      </div>
    );
  }

  const rowHeight = Math.min(48, (height - 60) / tableSize);
  const startY = 30;
  const indexWidth = 48;
  const entryWidth = 52;

  return (
    <div className="relative overflow-auto" style={{ width, height }}>
      {/* 哈希函数说明 */}
      <div
        className="absolute text-xs font-mono"
        style={{ top: 6, left: 8, color: "var(--text-muted)" }}
      >
        {hashFunc}
      </div>

      {/* 桶列表 */}
      <AnimatePresence mode="popLayout">
        {buckets.map((bucket, rowIdx) => {
          const y = startY + rowIdx * rowHeight;
          const bStyle = bucketStatusStyles[bucket.status] || bucketStatusStyles.default;

          return (
            <motion.div
              key={bucket.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute flex items-center"
              style={{ top: y, left: 0, width, height: rowHeight - 4 }}
            >
              {/* 桶索引 */}
              <div
                className="flex items-center justify-center rounded text-xs font-bold font-mono"
                style={{
                  width: indexWidth,
                  height: rowHeight - 8,
                  background: bStyle.bg,
                  border: `2px solid ${bStyle.border}`,
                  color: "var(--text)",
                }}
              >
                {bucket.index}
              </div>

              {/* 桶内容 */}
              <div className="flex items-center gap-1 ml-2">
                {bucket.entries.length === 0 ? (
                  <div
                    className="flex items-center justify-center rounded text-xs font-mono"
                    style={{
                      width: entryWidth,
                      height: rowHeight - 12,
                      border: `1px dashed var(--border)`,
                      color: "var(--text-muted)",
                    }}
                  >
                    空
                  </div>
                ) : (
                  bucket.entries.map((entry, entryIdx) => {
                    const eStyle = entryStatusStyles[entry.status] || entryStatusStyles.default;

                    return (
                      <div key={entry.id} className="flex items-center">
                        {/* 链地址法箭头 */}
                        {entryIdx > 0 && (
                          <svg width={12} height={rowHeight - 12} className="shrink-0">
                            <line x1="0" y1={(rowHeight - 12) / 2} x2="10" y2={(rowHeight - 12) / 2} stroke="var(--text-muted)" strokeWidth="2" />
                            <polygon points="8,3 12,7 8,11" fill="var(--text-muted)" transform={`translate(0, ${(rowHeight - 12) / 2 - 7})`} />
                          </svg>
                        )}
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center justify-center rounded font-mono text-sm font-semibold"
                          style={{
                            width: entryWidth,
                            height: rowHeight - 12,
                            background: eStyle.bg,
                            border: `2px solid ${eStyle.border}`,
                            color: eStyle.text,
                          }}
                        >
                          {entry.key}
                          {entry.status === "deleted" && (
                            <span className="absolute text-[8px] opacity-70">DEL</span>
                          )}
                        </motion.div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
