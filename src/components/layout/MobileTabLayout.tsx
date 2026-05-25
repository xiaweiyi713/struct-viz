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
  const touchStartX = useRef<number | null>(null);

  const switchTab = (next: number) => {
    if (next === activeTab || next < 0 || next >= tabs.length) return;
    setDirection(next > activeTab ? 1 : -1);
    setActiveTab(next);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 md:hidden">
      <div
        className="flex-1 min-h-0 overflow-hidden"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const diff = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(diff) > 60) {
            switchTab(diff > 0 ? activeTab - 1 : activeTab + 1);
          }
          touchStartX.current = null;
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
