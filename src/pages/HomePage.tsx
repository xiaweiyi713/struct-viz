import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { templates } from "../data/templates";
import { subjects, type SubjectInfo } from "../data/subjects";

const subjectIcons: Record<string, React.ReactNode> = {
  "data-structures": (
    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="6" r="4" fill="currentColor" opacity="0.8"/>
      <circle cx="7" cy="18" r="3.5" fill="currentColor" opacity="0.6"/>
      <circle cx="21" cy="18" r="3.5" fill="currentColor" opacity="0.6"/>
      <circle cx="4" cy="25" r="2.5" fill="currentColor" opacity="0.4"/>
      <circle cx="10" cy="25" r="2.5" fill="currentColor" opacity="0.4"/>
      <circle cx="18" cy="25" r="2.5" fill="currentColor" opacity="0.4"/>
      <circle cx="24" cy="25" r="2.5" fill="currentColor" opacity="0.4"/>
      <line x1="14" y1="10" x2="7" y2="14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <line x1="14" y1="10" x2="21" y2="14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <line x1="7" y1="21.5" x2="4" y2="22.5" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/>
      <line x1="7" y1="21.5" x2="10" y2="22.5" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/>
      <line x1="21" y1="21.5" x2="18" y2="22.5" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/>
      <line x1="21" y1="21.5" x2="24" y2="22.5" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/>
    </svg>
  ),
  "computer-organization": (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="7" y="7" width="4" height="4" rx="0.5"/>
      <rect x="13" y="7" width="4" height="4" rx="0.5"/>
      <rect x="7" y="13" width="4" height="4" rx="0.5"/>
      <rect x="13" y="13" width="4" height="4" rx="0.5"/>
    </svg>
  ),
  "operating-systems": (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
      <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
      <line x1="7" y1="13" x2="17" y2="13"/>
    </svg>
  ),
  "computer-networks": (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3"/>
      <circle cx="12" cy="4" r="2"/>
      <circle cx="12" cy="20" r="2"/>
      <circle cx="4" cy="12" r="2"/>
      <circle cx="20" cy="12" r="2"/>
      <line x1="12" y1="6" x2="12" y2="9"/>
      <line x1="12" y1="15" x2="12" y2="18"/>
      <line x1="6" y1="12" x2="9" y2="12"/>
      <line x1="15" y1="12" x2="18" y2="12"/>
    </svg>
  ),
};

function SubjectCard({ subject, count }: { subject: SubjectInfo; count: number }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/subject/${subject.id}`)}
      className={`group text-left p-8 rounded-2xl bg-gradient-to-br ${subject.bgLight} ${subject.bgDark} border ${subject.border} hover:-translate-y-1.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)] transition-all duration-300`}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-gradient-to-br ${subject.gradient} text-white`}>
        {subjectIcons[subject.id]}
      </div>
      <h3 className="text-xl font-bold mb-2">{subject.name}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{subject.description}</p>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${subject.gradient} text-white`}>
          {count} 个算法
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {subject.categories.length} 个单元
        </span>
      </div>
    </button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of templates) {
      counts[t.subject] = (counts[t.subject] || 0) + 1;
    }
    return counts;
  }, []);

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
      <section className="relative min-h-[70vh] flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500 blur-[120px] opacity-[0.12] dark:opacity-[0.15] pointer-events-none" />
        <div className="absolute top-[100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-violet-500 blur-[120px] opacity-[0.08] dark:opacity-[0.12] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/50 mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/>
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">面向 408 考研 · 四科全覆盖</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span
              className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-400 bg-clip-text"
              style={{ WebkitTextFillColor: "transparent" }}
            >
              Struct-Viz
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 mb-4 max-w-2xl mx-auto leading-relaxed">
            把计算机考研核心算法的执行过程<span className="text-slate-900 dark:text-white font-semibold">画出来</span>
          </p>
          <p className="text-base text-slate-400 dark:text-slate-500 mb-10 max-w-xl mx-auto">
            覆盖数据结构、组成原理、操作系统、计算机网络四大科目，逐步动画展示
          </p>

          <div className="flex items-center justify-center gap-8 sm:gap-12 mt-12 text-sm text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{templates.length}+</span>
              <span>算法模板</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"/>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">4</span>
              <span>考试科目</span>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"/>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">7</span>
              <span>可视化器</span>
            </div>
          </div>
        </div>
      </section>

      {/* 分隔线 */}
      <div className="max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"/>

      {/* 科目卡片 */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">四大科目</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">选择一个科目开始学习</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-lg mx-auto">点击科目卡片，浏览该科目下的算法模板，开始可视化实验</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {subjects.map((s) => (
              <SubjectCard key={s.id} subject={s} count={subjectCounts[s.id] || 0} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <div className="max-w-4xl mx-auto h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"/>
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">特性</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-3">直观理解每一步</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
                title: "代码驱动",
                desc: "输入 StructScript 代码，即写即跑。覆盖四大科目核心算法。",
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>,
                title: "动画可视化",
                desc: "D3.js 驱动的逐步动画，直观展示每次操作的影响。节点、矩阵、状态变化一目了然。",
              },
              {
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                title: "单步调试",
                desc: "逐步前进/后退、播放/暂停、变速回放。每一步都有详细说明和变量快照。",
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
          <div className="text-sm text-slate-400">408 考研四科可视化工具</div>
        </div>
      </footer>
    </div>
  );
}
