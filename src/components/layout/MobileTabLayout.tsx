import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Tab {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileTabLayoutProps {
  tabs: Tab[];
  children: React.ReactNode[];
}

export default function MobileTabLayout({ tabs, children }: MobileTabLayoutProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [direction, setDirection] = useState(0);
  const touchStart = useRef<{ x: number; y: number; interactive: boolean } | null>(null);

  const switchTab = (next: number) => {
    if (next === activeTab || next < 0 || next >= tabs.length) return;
    setDirection(next > activeTab ? 1 : -1);
    setActiveTab(next);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 md:hidden">
      <div
        className="flex-1 min-h-0 overflow-hidden"
        onTouchStart={(e) => {
          const target = e.target as HTMLElement;
          // D3 画布 / Monaco 编辑器内部的手势归它们自己处理，不触发切 Tab
          const interactive = !!target.closest("svg, canvas, .monaco-editor, [data-noswipe]");
          touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            interactive,
          };
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start || start.interactive) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          // 明确的水平滑动才切 Tab，避免竖向滚动误触
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            switchTab(dx > 0 ? activeTab - 1 : activeTab + 1);
          }
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ x: direction * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -direction * 80, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="h-full"
          >
            {children[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => switchTab(i)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeTab === i
                ? "text-indigo-500"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
