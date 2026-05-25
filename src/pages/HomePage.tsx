import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { templates } from "../data/templates";
import { examReferences } from "../data/examReferences";

const categories = [
  { key: "all", label: "全部" },
  { key: "linear", label: "线性结构" },
  { key: "tree", label: "树结构" },
  { key: "graph", label: "图算法" },
  { key: "sorting", label: "排序算法" },
  { key: "searching", label: "查找算法" },
  { key: "greedy", label: "贪心算法" },
  { key: "dp", label: "动态规划" },
] as const;

const difficultyClasses: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-500 dark:text-amber-400",
  hard: "bg-red-500/10 text-red-500 dark:text-red-400",
};

const difficultyLabel: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const stats = [
  { value: "19", label: "树结构算法" },
  { value: "11", label: "图算法" },
  { value: "9", label: "排序算法" },
  { value: "7", label: "可视化器" },
];

// 根据 supportedClass 推断可视化器类型
function getVisualizerType(template: { supportedClass: string }): string {
  const cls = template.supportedClass.toLowerCase();
  if (cls.includes("tree") || cls.includes("bst") || cls.includes("avl") || cls.includes("rbtree") || cls.includes("btree") || cls.includes("trie") || cls.includes("splay") || cls.includes("huffman")) return "tree";
  if (cls.includes("graph")) return "graph";
  if (cls.includes("stack")) return "stack";
  if (cls.includes("queue")) return "queue";
  if (cls.includes("string") || cls.includes("kmp") || cls.includes("naive")) return "string";
  if (cls.includes("hash")) return "hashtable";
  if (cls.includes("matrix") || cls.includes("knapsack") || cls.includes("lcs") || cls.includes("edit") || cls.includes("chain") || cls.includes("lis")) return "matrix";
  if (cls.includes("multiarray") || cls.includes("radix") || cls.includes("counting") || cls.includes("fractionalknapsack") || cls.includes("jobscheduling")) return "multiarray";
  if (cls.includes("uf") || cls.includes("union")) return "array";
  return "array";
}

export default function HomePage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    if (!matchesCategory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.nameEn.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden">
      {/* 网格背景 */}
      <div
        className="fixed inset-0 pointer-events-none opacity-100"
        style={{
          backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* 背景光晕 */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500 blur-[120px] opacity-[0.12] dark:opacity-[0.15] pointer-events-none" />
        <div className="absolute top-[100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-violet-500 blur-[120px] opacity-[0.08] dark:opacity-[0.12] pointer-events-none" />

        {/* 背景树形装饰 */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06] dark:opacity-[0.08] pointer-events-none" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="treeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#6366f1"/>
              <stop offset="1" stopColor="#8b5cf6"/>
            </linearGradient>
          </defs>
          <line x1="600" y1="120" x2="400" y2="350" stroke="url(#treeGrad)" strokeWidth="2">
            <animate attributeName="opacity" values="0.15;0.4;0.15" dur="3s" repeatCount="indefinite"/>
          </line>
          <line x1="600" y1="120" x2="800" y2="350" stroke="url(#treeGrad)" strokeWidth="2">
            <animate attributeName="opacity" values="0.15;0.4;0.15" dur="3s" begin="0.5s" repeatCount="indefinite"/>
          </line>
          <line x1="400" y1="350" x2="300" y2="580" stroke="url(#treeGrad)" strokeWidth="2">
            <animate attributeName="opacity" values="0.15;0.4;0.15" dur="3s" begin="1s" repeatCount="indefinite"/>
          </line>
          <line x1="400" y1="350" x2="500" y2="580" stroke="url(#treeGrad)" strokeWidth="2">
            <animate attributeName="opacity" values="0.15;0.4;0.15" dur="3s" begin="1.5s" repeatCount="indefinite"/>
          </line>
          <line x1="800" y1="350" x2="700" y2="580" stroke="url(#treeGrad)" strokeWidth="2">
            <animate attributeName="opacity" values="0.15;0.4;0.15" dur="3s" begin="2s" repeatCount="indefinite"/>
          </line>
          <line x1="800" y1="350" x2="900" y2="580" stroke="url(#treeGrad)" strokeWidth="2">
            <animate attributeName="opacity" values="0.15;0.4;0.15" dur="3s" begin="2.5s" repeatCount="indefinite"/>
          </line>
          <circle cx="600" cy="120" r="5" fill="url(#treeGrad)">
            <animate attributeName="r" values="4;6;4" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="400" cy="350" r="4" fill="url(#treeGrad)">
            <animate attributeName="r" values="3;5;3" dur="3s" begin="0.3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="800" cy="350" r="4" fill="url(#treeGrad)">
            <animate attributeName="r" values="3;5;3" dur="3s" begin="0.6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="300" cy="580" r="3" fill="url(#treeGrad)"/>
          <circle cx="500" cy="580" r="3" fill="url(#treeGrad)"/>
          <circle cx="700" cy="580" r="3" fill="url(#treeGrad)"/>
          <circle cx="900" cy="580" r="3" fill="url(#treeGrad)"/>
        </svg>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* 标签 pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/50 mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/>
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">面向 408 考研</span>
          </div>

          {/* 标题 */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span
              className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-400 bg-clip-text"
              style={{ WebkitTextFillColor: "transparent" }}
            >
              Struct-Viz
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 mb-4 max-w-2xl mx-auto leading-relaxed">
            把数据结构的执行过程<span className="text-slate-900 dark:text-white font-semibold">画出来</span>
          </p>
          <p className="text-base text-slate-400 dark:text-slate-500 mb-10 max-w-xl mx-auto">
            输入代码，逐步动画展示。覆盖 BST、AVL、红黑树、图算法等 53+ 核心算法
          </p>

          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/sandbox")}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold px-10 py-4 rounded-xl text-base hover:shadow-[0_8px_30px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 transition-all duration-300"
            >
              开始实验 &rarr;
            </button>
            <button
              onClick={() => document.getElementById("templates")?.scrollIntoView({ behavior: "smooth" })}
              className="px-10 py-4 rounded-xl text-base font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-indigo-400/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              浏览模板
            </button>
          </div>

          {/* 统计摘要 */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mt-16 text-sm text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{templates.length}</span>
              <span>算法模板</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"/>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">7</span>
              <span>可视化器</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"/>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">7</span>
              <span>分类</span>
            </div>
          </div>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"/>

      {/* Feature Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">特性</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">直观理解每一步</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-lg mx-auto">不只是看代码跑，而是看到数据结构如何一步步变化</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
                title: "代码驱动",
                desc: "输入 C++ 风格的 StructScript 代码，即写即跑。支持栈、队列、BST、图等数据结构操作。",
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>,
                title: "动画可视化",
                desc: "D3.js 驱动的逐步动画，直观展示每次操作对数据结构的影响。节点、边、颜色变化一目了然。",
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                title: "单步调试",
                desc: "类调试器体验：逐步前进/后退、播放/暂停、变速回放。每一步都有详细的操作说明和变量快照。",
              },
            ].map((f) => (
              <div key={f.title} className="group p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-[0_12px_40px_rgba(99,102,241,0.12)] transition-all duration-300">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-indigo-500 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg mb-3">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"/>

      {/* Templates Section */}
      <section id="templates" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">模板库</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">{templates.length} 个算法模板</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-lg mx-auto">覆盖 408 考研数据结构全部核心算法，点击即可开始实验</p>
          </div>

          {/* 搜索栏 */}
          <div className="max-w-md mx-auto mb-6">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索算法名称..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-slate-400 mt-2 text-center">
                找到 {filteredTemplates.length} 个结果
              </p>
            )}
          </div>

          {/* 分类标签 */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 ${
                  activeCategory === cat.key
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-transparent"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 模板卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => navigate(`/sandbox?template=${template.id}`)}
                className="group text-left p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-[0_12px_40px_rgba(99,102,241,0.12)] transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-md text-xs font-semibold ${difficultyClasses[template.difficulty]}`}>
                    {difficultyLabel[template.difficulty]}
                  </span>
                  <span className="ml-auto flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < template.examFrequency ? "#f59e0b" : "#e2e8f0"}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </span>
                </div>
                <h4 className="font-bold text-base mb-2">{template.name}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{template.description}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">{getVisualizerType(template)}</span>
                  {examReferences[template.id] && (
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
                      408真题 ×{examReferences[template.id].length}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"/>

      {/* Stats Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">覆盖范围</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">全面覆盖 408 大纲</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:bg-gradient-to-br hover:from-indigo-500/5 hover:to-violet-500/5 transition-all">
                <div className="text-4xl font-extrabold mb-2 bg-gradient-to-br from-indigo-500 to-violet-500 bg-clip-text" style={{ WebkitTextFillColor: "transparent" }}>{s.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="6" r="4" fill="#6366f1"/>
              <circle cx="7" cy="18" r="3.5" fill="#6366f1" opacity="0.7"/>
              <circle cx="21" cy="18" r="3.5" fill="#6366f1" opacity="0.7"/>
              <line x1="14" y1="10" x2="7" y2="14.5" stroke="#6366f1" strokeWidth="1.5"/>
              <line x1="14" y1="10" x2="21" y2="14.5" stroke="#6366f1" strokeWidth="1.5"/>
            </svg>
            <span className="text-sm text-slate-400">Struct-Viz &copy; 2026</span>
          </div>
          <div className="text-sm text-slate-400">408 考研数据结构可视化工具</div>
        </div>
      </footer>
    </div>
  );
}
