import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSandboxStore } from "../../stores/sandboxStore";
import { templates } from "../../data/templates";

const difficultyClasses: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-500",
  medium: "bg-amber-500/10 text-amber-500",
  hard: "bg-red-500/10 text-red-500",
};

const difficultyLabel: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const categoryLabel: Record<string, string> = {
  linear: "线性结构",
  tree: "树结构",
  graph: "图算法",
  sorting: "排序算法",
  searching: "查找算法",
  greedy: "贪心算法",
  dp: "动态规划",
};

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { isDark, toggleTheme, setTemplate, selectedTemplate, setCode } = useSandboxStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setTemplate(templateId);
      setCode(template.code);
    }
    setDropdownOpen(false);
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplate);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60">
        {/* Logo */}
        <button onClick={() => navigate("/")} className="flex items-center gap-3 group">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
            <circle cx="14" cy="6" r="4" fill="url(#logoGrad)"/>
            <circle cx="7" cy="18" r="3.5" fill="url(#logoGrad)" opacity="0.7"/>
            <circle cx="21" cy="18" r="3.5" fill="url(#logoGrad)" opacity="0.7"/>
            <line x1="14" y1="10" x2="7" y2="14.5" stroke="url(#logoGrad)" strokeWidth="1.5"/>
            <line x1="14" y1="10" x2="21" y2="14.5" stroke="url(#logoGrad)" strokeWidth="1.5"/>
          </svg>
          <span className="text-lg font-bold bg-gradient-to-br from-indigo-500 to-violet-500 bg-clip-text hidden sm:inline" style={{ WebkitTextFillColor: "transparent" }}>
            Struct-Viz
          </span>
        </button>

        {/* 中间区域：首页=锚点导航 / 沙盒页=模板下拉 */}
        {isHome ? (
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">特性</a>
            <a href="#templates" className="hover:text-slate-900 dark:hover:text-white transition-colors">模板</a>
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400/40 transition-all"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>{activeTemplate ? activeTemplate.name : "选择算法模板"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-96 rounded-xl z-50 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="max-h-96 overflow-y-auto py-1">
                  {(["linear", "tree", "graph", "sorting", "searching", "greedy", "dp"] as const).map((category) => {
                    const categoryTemplates = templates.filter((t) => t.category === category);
                    if (categoryTemplates.length === 0) return null;
                    return (
                      <div key={category}>
                        <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {categoryLabel[category]}
                        </div>
                        {categoryTemplates.map((template) => (
                          <button
                            key={template.id}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedTemplate === template.id ? "bg-slate-50 dark:bg-slate-800/50" : ""}`}
                            onClick={() => handleSelectTemplate(template.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                {template.name}
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${difficultyClasses[template.difficulty]}`}>
                                  {difficultyLabel[template.difficulty]}
                                </span>
                              </div>
                              <div className="text-xs mt-1 truncate text-slate-400 dark:text-slate-500">
                                {template.description}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={i < template.examFrequency ? "#f59e0b" : "#e2e8f0"}>
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 右侧按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title={isDark ? "切换亮色模式" : "切换暗色模式"}
          >
            <div className={`transition-transform duration-500 ${isDark ? "rotate-360" : "rotate-0"}`}>
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </div>
          </button>
          {!isHome && (
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          )}
          {isHome && (
            <button
              onClick={() => navigate("/sandbox")}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:shadow-[0_8px_30px_rgba(99,102,241,0.35)] transition-all"
            >
              打开沙盒
            </button>
          )}
        </div>
      </nav>
      {/* 占位空间 */}
      <div className="h-16 shrink-0"/>
    </>
  );
}
