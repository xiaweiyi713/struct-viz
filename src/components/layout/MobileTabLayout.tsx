import { useState } from "react";

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

  return (
    <div className="flex flex-col flex-1 min-h-0 md:hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        {children[activeTab]}
      </div>
      <div className="flex border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(i)}
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
