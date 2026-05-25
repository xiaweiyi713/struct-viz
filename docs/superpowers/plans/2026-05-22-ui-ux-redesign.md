# Struct-Viz UI/UX 全面改造 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Struct-Viz 从内联样式迁移到 Tailwind CSS，重新设计首页和沙盒页，添加可拖拽分栏、键盘快捷键和全设备响应式适配。

**Architecture:** 样式系统从 CSS 变量 + 内联 style 全面迁移到 Tailwind 类名 + `dark:` 前缀。沙盒页三栏布局改为可拖拽的 ResizableLayout 组件。移动端采用 Tab 切换单栏布局。键盘快捷键封装为独立 Hook。

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand 5, D3.js 7, Framer Motion 12, Monaco Editor

---

## File Structure

### 新建文件
| 文件 | 职责 |
|------|------|
| `src/hooks/useKeyboardShortcuts.ts` | 键盘快捷键 Hook |
| `src/components/layout/ResizableLayout.tsx` | 可拖拽分栏组件 |
| `src/components/layout/MobileTabLayout.tsx` | 移动端 Tab 布局组件 |

### 修改文件
| 文件 | 改动范围 |
|------|----------|
| `src/index.css` | 移除 CSS 变量双主题，精简为 Tailwind + 品牌色 |
| `src/pages/HomePage.tsx` | 全面重写：新设计 + Tailwind 类名 |
| `src/pages/SandboxPage.tsx` | 全面重写：可拖拽分栏 + 响应式 |
| `src/components/layout/TopNav.tsx` | 全面重写：毛玻璃导航 + Tailwind |
| `src/components/timeline/PlaybackControls.tsx` | 全面重写：5 档速度 + Tailwind |
| `src/components/inspector/StateInspector.tsx` | 全面重写：Tailwind 类名 |
| `src/components/editor/CodeEditor.tsx` | 小幅调整：loading 文字颜色 |
| `src/stores/sandboxStore.ts` | 速度默认值调整 |

### 不变文件
- `src/components/visualizers/*` — 7 个可视化器组件保持原样
- `src/core/*` — 算法 runtime、parser 等保持原样
- `src/data/templates.ts` — 模板数据保持原样
- `src/types/*` — 类型定义保持原样

---

## Task 1: 样式系统重构 — index.css

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 重写 index.css**

移除 `:root` 和 `.dark` 中的 CSS 变量映射（`--bg`、`--surface`、`--text` 等），只保留 `@theme` 中的品牌色定义和全局基础样式。

```css
@import "tailwindcss";

@theme {
  --color-primary: #4f46e5;
  --color-primary-light: #818cf8;
  --color-accent: #7c3aed;
  --color-accent-light: #a78bfa;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}

@layer base {
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
    width: 100%;
  }

  body {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* 精致的滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Range Input 自定义样式 */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6366f1;
  border: 2px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  margin-top: -5px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

input[type="range"]::-moz-range-track {
  height: 6px;
  border-radius: 3px;
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #6366f1;
  border: 2px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease;
}

input[type="range"]::-moz-range-thumb:hover {
  transform: scale(1.2);
}
```

- [ ] **Step 2: 验证 dev server 正常**

Run: `cd /Users/xuwenyao/projects/struct-viz && npx tsc --noEmit 2>&1 | head -20`

预期：可能有其他文件的类型错误（因为移除了 CSS 变量），但不应有 index.css 本身的编译错误。暂时忽略其他文件的错误，后续 task 会逐一修复。

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "refactor: 精简 index.css，移除 CSS 变量双主题系统"
```

---

## Task 2: 首页重新设计 — HomePage.tsx

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: 重写 HomePage.tsx**

完全重写首页，使用 Tailwind 类名 + `dark:` 前缀。参考 `docs/mocks/homepage-redesign.html` 模型。关键要素：

- 固定导航栏（由 TopNav 组件处理，不在 HomePage 内）
- Hero 区域：标签 pill + 渐变标题 + 统计摘要 + CTA 按钮
- Feature 区域：三列卡片
- 模板区域：分类标签筛选 + 卡片网格（底部增加可视化器类型标签）
- 统计区域：4 格统计卡片
- Footer：简化一行

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { templates } from "../data/templates";

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

const categoryIcons: Record<string, string> = {
  linear: "📚",
  tree: "🌳",
  graph: "🔗",
  sorting: "📊",
  searching: "🔍",
  greedy: "🎯",
  dp: "📋",
};

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
  if (cls.includes("string") || cls.includes("kmp") || cls.includes("naive")) return "string";
  if (cls.includes("hash")) return "hashtable";
  if (cls.includes("matrix") || cls.includes("knapsack") || cls.includes("lcs") || cls.includes("edit") || cls.includes("chain") || cls.includes("lis")) return "matrix";
  if (cls.includes("multiarray") || cls.includes("radix") || cls.includes("counting")) return "multiarray";
  if (cls.includes("uf") || cls.includes("union")) return "array";
  return "array";
}

export default function HomePage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredTemplates = activeCategory === "all"
    ? templates
    : templates.filter((t) => t.category === activeCategory);

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
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">{getVisualizerType(template)}</span>
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
```

- [ ] **Step 2: 验证首页渲染**

在浏览器打开 `http://localhost:5173/`，检查：
- 亮色/暗色模式切换正常
- 模板分类筛选功能正常
- 模板卡片点击可跳转到沙盒页
- 无控制台错误

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: 首页重新设计 - Linear 风格 + Tailwind 类名 + 分类筛选"
```

---

## Task 3: 导航栏重构 — TopNav.tsx

**Files:**
- Modify: `src/components/layout/TopNav.tsx`

- [ ] **Step 1: 重写 TopNav.tsx**

将导航栏重构为毛玻璃效果 + Tailwind 类名。关键变化：
- 固定顶部 `h-16`，`backdrop-blur`
- 首页显示锚点导航，沙盒页显示模板下拉
- 主题切换按钮 + "打开沙盒" CTA
- 移动端隐藏中间导航链接

```tsx
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
```

- [ ] **Step 2: 验证导航栏**

在浏览器检查：
- 首页：显示锚点导航 + "打开沙盒"按钮
- 沙盒页：显示模板下拉 + GitHub 链接
- 主题切换正常
- 移动端隐藏中间导航链接

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopNav.tsx
git commit -m "feat: TopNav 重构 - 毛玻璃效果 + Tailwind + 响应式"
```

---

## Task 4: ResizableLayout 可拖拽分栏组件

**Files:**
- Create: `src/components/layout/ResizableLayout.tsx`

- [ ] **Step 1: 创建 ResizableLayout 组件**

```tsx
import { useState, useRef, useCallback, useEffect } from "react";

interface Panel {
  key: string;
  minWidth: number;
  defaultPercent: number;
}

interface ResizableLayoutProps {
  panels: Panel[];
  children: React.ReactNode[];
  storageKey?: string;
}

export default function ResizableLayout({ panels, children, storageKey }: ResizableLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragIndexRef = useRef<number | null>(null);

  const loadSizes = (): number[] => {
    if (!storageKey) return panels.map((p) => p.defaultPercent);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as number[];
        if (parsed.length === panels.length) return parsed;
      }
    } catch {}
    return panels.map((p) => p.defaultPercent);
  };

  const [sizes, setSizes] = useState<number[]>(loadSizes);

  const saveSizes = useCallback((newSizes: number[]) => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newSizes));
    }
  }, [storageKey]);

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragIndexRef.current = index;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragIndexRef.current === null || !containerRef.current) return;
      const container = containerRef.current;
      const containerWidth = container.offsetWidth;
      const index = dragIndexRef.current;

      // 拖拽手柄位于 index 和 index+1 之间
      const x = e.clientX - container.getBoundingClientRect().left;
      const leftPercent = (x / containerWidth) * 100;

      setSizes((prev) => {
        const totalLeft = prev.slice(0, index).reduce((a, b) => a + b, 0);
        const newLeft = Math.max(panels[index].minWidth / containerWidth * 100, Math.min(leftPercent - totalLeft, 100 - totalLeft - panels[index + 1].minWidth / containerWidth * 100));
        const diff = newLeft - prev[index];
        const next = [...prev];
        next[index] = newLeft;
        next[index + 1] = prev[index + 1] - diff;
        saveSizes(next);
        return next;
      });
    };

    const handleMouseUp = () => {
      dragIndexRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [panels, saveSizes]);

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 w-full">
      {panels.map((panel, i) => (
        <div key={panel.key} className="flex h-full" style={{ width: `${sizes[i]}%` }}>
          <div className="flex-1 min-w-0 overflow-hidden">
            {children[i]}
          </div>
          {i < panels.length - 1 && (
            <div
              className="w-1 cursor-col-resize hover:bg-indigo-500/30 active:bg-indigo-500/50 transition-colors flex-shrink-0"
              onMouseDown={handleMouseDown(i)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/ResizableLayout.tsx
git commit -m "feat: 添加 ResizableLayout 可拖拽分栏组件"
```

---

## Task 5: MobileTabLayout 移动端布局组件

**Files:**
- Create: `src/components/layout/MobileTabLayout.tsx`

- [ ] **Step 1: 创建 MobileTabLayout 组件**

```tsx
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
      {/* 内容区域 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children[activeTab]}
      </div>
      {/* Tab 栏 */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MobileTabLayout.tsx
git commit -m "feat: 添加 MobileTabLayout 移动端 Tab 布局组件"
```

---

## Task 6: PlaybackControls 重构

**Files:**
- Modify: `src/components/timeline/PlaybackControls.tsx`

- [ ] **Step 1: 重写 PlaybackControls.tsx**

迁移到 Tailwind 类名，速度扩展为 5 档。

```tsx
interface PlaybackControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onGoToStep: (step: number) => void;
  onSpeedChange: (speed: number) => void;
}

const speeds = [0.25, 0.5, 1, 2, 4];

export default function PlaybackControls({
  currentStep,
  totalSteps,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  onGoToStep,
  onSpeedChange,
}: PlaybackControlsProps) {
  const hasFrames = totalSteps > 0;
  const displayStep = currentStep >= 0 ? currentStep + 1 : 0;

  return (
    <div className="flex items-center gap-4 px-5 py-2.5 shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      {/* 控制按钮 */}
      <div className="flex items-center gap-1.5">
        {/* 重置 */}
        <button
          onClick={onReset}
          disabled={!hasFrames}
          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 transition-colors"
          title="重置"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>

        {/* 上一步 */}
        <button
          onClick={onPrev}
          disabled={!hasFrames || currentStep <= 0}
          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 transition-colors"
          title="上一步"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
          </svg>
        </button>

        {/* 播放/暂停 */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={!hasFrames}
          className={`flex items-center justify-center w-10 h-10 rounded-full text-white transition-all ${
            hasFrames
              ? "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-md hover:scale-108 hover:shadow-lg"
              : "bg-slate-200 dark:bg-slate-700"
          }`}
          title={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3"/>
            </svg>
          )}
        </button>

        {/* 下一步 */}
        <button
          onClick={onNext}
          disabled={!hasFrames || currentStep >= totalSteps - 1}
          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 transition-colors"
          title="下一步"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
        </button>
      </div>

      {/* 进度条 */}
      <div className="flex-1 flex items-center">
        <input
          type="range"
          min={0}
          max={Math.max(totalSteps - 1, 0)}
          value={currentStep >= 0 ? currentStep : 0}
          onChange={(e) => onGoToStep(Number(e.target.value))}
          disabled={!hasFrames}
          className="w-full disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            background: hasFrames
              ? `linear-gradient(to right, #6366f1 ${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100}%, #e2e8f0 ${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100}%)`
              : "#e2e8f0",
          }}
        />
      </div>

      {/* 速度选择 */}
      <div className="hidden sm:flex items-center gap-1 rounded-lg p-1 bg-slate-100 dark:bg-slate-800">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
              speed === s
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* 步骤文字 */}
      <div className="text-sm font-mono tabular-nums shrink-0 min-w-[68px] text-right font-medium text-slate-500 dark:text-slate-400">
        {displayStep} / {totalSteps}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/timeline/PlaybackControls.tsx
git commit -m "feat: PlaybackControls 重构 - 5 档速度 + Tailwind"
```

---

## Task 7: StateInspector 重构

**Files:**
- Modify: `src/components/inspector/StateInspector.tsx`

- [ ] **Step 1: 重写 StateInspector.tsx**

将所有内联样式替换为 Tailwind 类名。`eventTypeConfig` 对象保持不变（SVG 内容字符串）。主要改动在 JSX 渲染部分：

- `style={{ color: "var(--text)" }}` → 移除（继承父级）
- `style={{ background: "var(--surface-secondary)" }}` → `bg-slate-100 dark:bg-slate-800/50`
- `style={{ border: "..." }}` → `border border-slate-200/80 dark:border-slate-800/80`
- `style={{ color: "var(--text-muted)" }}` → `text-slate-400 dark:text-slate-500`
- `style={{ color: "var(--primary)" }}` → `text-indigo-500`
- 所有 `onMouseEnter/Leave` → 移除，用 Tailwind `hover:` 前缀

保留不变的部分：
- `eventTypeConfig` 常量（SVG 内容字符串）
- `formatValue` 函数
- 所有逻辑和结构

- [ ] **Step 2: Commit**

```bash
git add src/components/inspector/StateInspector.tsx
git commit -m "refactor: StateInspector 迁移到 Tailwind 类名"
```

---

## Task 8: CodeEditor 小幅调整

**Files:**
- Modify: `src/components/editor/CodeEditor.tsx`

- [ ] **Step 1: 修改 CodeEditor 的 loading 文字颜色**

仅修改 loading 文字的样式（`style={{ color: "var(--text-muted)" }}` → `text-slate-400 dark:text-slate-500`）。其余代码不变。

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/CodeEditor.tsx
git commit -m "refactor: CodeEditor loading 文字迁移到 Tailwind"
```

---

## Task 9: SandboxPage 全面重写

**Files:**
- Modify: `src/pages/SandboxPage.tsx`

- [ ] **Step 1: 重写 SandboxPage.tsx**

整合 ResizableLayout、MobileTabLayout、键盘快捷键。关键结构：

```tsx
// 桌面端 (≥768px):
//   TopNav
//   ResizableLayout (3 panels: 编辑器 | 可视化 | 状态面板)
//   PlaybackControls

// 移动端 (<768px):
//   TopNav
//   MobileTabLayout (3 tabs: 代码 | 可视化 | 状态)
//   PlaybackControls
```

新增逻辑：
- 导入 `useKeyboardShortcuts` Hook
- 桌面端使用 `ResizableLayout`，面板配置为 `[{ key: "editor", minWidth: 240, defaultPercent: 30 }, { key: "visual", minWidth: 320, defaultPercent: 40 }, { key: "inspector", minWidth: 240, defaultPercent: 30 }]`
- 移动端使用 `MobileTabLayout`，三个 Tab：「代码」「可视化」「状态」
- 使用 CSS 媒体查询或 `useMediaQuery` Hook 判断设备宽度
- 速度默认值从 `1` 不变

所有内联样式替换为 Tailwind 类名，与之前各 Task 保持一致。

- [ ] **Step 2: 验证沙盒页**

在浏览器检查：
- 桌面端三栏可拖拽，localStorage 持久化
- 模板加载和运行正常
- 可视化器渲染正常
- 播放控制正常
- 窄屏时切换为 Tab 布局

- [ ] **Step 3: Commit**

```bash
git add src/pages/SandboxPage.tsx
git commit -m "feat: SandboxPage 重写 - 可拖拽分栏 + 移动端 Tab 布局 + Tailwind"
```

---

## Task 10: 键盘快捷键 Hook

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/pages/SandboxPage.tsx`（在 Task 9 中已预留导入）

- [ ] **Step 1: 创建 useKeyboardShortcuts Hook**

```ts
import { useEffect } from "react";

interface ShortcutActions {
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
}

const speedMap: Record<string, number> = {
  "1": 0.25,
  "2": 0.5,
  "3": 1,
  "4": 2,
  "5": 4,
};

export function useKeyboardShortcuts({
  onTogglePlay,
  onNext,
  onPrev,
  onReset,
  onSetSpeed,
}: ShortcutActions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      // 忽略 Monaco 编辑器和输入框内的按键
      if (
        active?.closest(".monaco-editor") ||
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          onTogglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          onNext();
          break;
        case "r":
        case "R":
          e.preventDefault();
          onReset();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
          e.preventDefault();
          onSetSpeed(speedMap[e.key]);
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onTogglePlay, onNext, onPrev, onReset, onSetSpeed]);
}
```

- [ ] **Step 2: 在 SandboxPage 中集成 Hook**

在 Task 9 的 SandboxPage 中添加调用：
```tsx
const { play, pause, nextStep, prevStep, reset, setSpeed, isPlaying } = useSandboxStore();

useKeyboardShortcuts({
  onTogglePlay: useCallback(() => isPlaying ? pause() : play(), [isPlaying, play, pause]),
  onNext: nextStep,
  onPrev: prevStep,
  onReset: reset,
  onSetSpeed: setSpeed,
});
```

- [ ] **Step 3: 验证快捷键**

在沙盒页运行一个模板，测试：
- `Space` 播放/暂停
- `←` / `→` 步进
- `R` 重置
- `1-5` 速度切换
- 在 Monaco 编辑器内打字时快捷键不触发

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts src/pages/SandboxPage.tsx
git commit -m "feat: 添加键盘快捷键支持"
```

---

## Task 11: 最终验证与清理

**Files:**
- Modify: `src/stores/sandboxStore.ts`（如有需要）
- Modify: `DEV_PROGRESS.md`

- [ ] **Step 1: TypeScript 编译检查**

Run: `cd /Users/xuwenyao/projects/struct-viz && npx tsc --noEmit`

预期：0 错误。如果有错误，逐一修复。

- [ ] **Step 2: 生产构建**

Run: `cd /Users/xuwenyao/projects/struct-viz && npm run build`

预期：构建成功。

- [ ] **Step 3: 浏览器全面回归测试**

逐项验证：
- 首页：亮色/暗色、分类筛选、卡片跳转
- 沙盒页：三栏拖拽、模板运行、可视化、播放控制（5 档速度）
- 键盘快捷键：Space / ← / → / R / 1-5
- 暗色模式：全局切换正常
- 移动端（浏览器 DevTools 模拟）：Tab 切换布局正常

- [ ] **Step 4: 更新 DEV_PROGRESS.md**

在文档中添加 UI/UX 改造记录。

- [ ] **Step 5: 最终 Commit**

```bash
git add -A
git commit -m "chore: UI/UX 全面改造完成 - Tailwind 迁移 + 首页重设计 + 可拖拽分栏 + 键盘快捷键 + 响应式"
```
