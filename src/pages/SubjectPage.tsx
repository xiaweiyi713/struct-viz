import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { templates } from "../data/templates";
import { subjects } from "../data/subjects";
import { examReferences } from "../data/examReferences";
import { useHomeStore } from "../stores/homeStore";

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

function getVisualizerType(template: { supportedClass: string }): string {
  const cls = template.supportedClass.toLowerCase();
  if (cls.includes("tree") || cls.includes("bst") || cls.includes("avl") || cls.includes("rbtree") || cls.includes("btree") || cls.includes("trie") || cls.includes("splay") || cls.includes("huffman")) return "tree";
  if (cls.includes("graph") || cls.includes("tcp")) return "graph";
  if (cls.includes("stack")) return "stack";
  if (cls.includes("queue")) return "queue";
  if (cls.includes("string") || cls.includes("kmp") || cls.includes("naive")) return "string";
  if (cls.includes("hash")) return "hashtable";
  if (cls.includes("matrix") || cls.includes("knapsack") || cls.includes("lcs") || cls.includes("edit") || cls.includes("chain") || cls.includes("lis") || cls.includes("banker") || cls.includes("cache") || cls.includes("pipeline") || cls.includes("distance")) return "matrix";
  if (cls.includes("multiarray") || cls.includes("radix") || cls.includes("counting") || cls.includes("fractionalknapsack") || cls.includes("jobscheduling")) return "multiarray";
  if (cls.includes("uf") || cls.includes("union")) return "array";
  return "array";
}

export default function SubjectPage() {
  const navigate = useNavigate();
  const { subjectId } = useParams<{ subjectId: string }>();
  const subject = subjects.find((s) => s.id === subjectId);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { favoriteIds, recentIds, toggleFavorite, isFavorite } = useHomeStore();

  const subjectTemplates = useMemo(
    () => templates.filter((t) => t.subject === subjectId),
    [subjectId],
  );

  const categories = useMemo(() => {
    if (!subject) return [];
    return [
      { key: "all", label: "全部" },
      { key: "recent", label: "最近使用" },
      { key: "favorite", label: "收藏" },
      ...subject.categories,
    ];
  }, [subject]);

  const filteredTemplates = useMemo(
    () =>
      subjectTemplates.filter((t) => {
        if (activeCategory === "recent") return recentIds.includes(t.id);
        if (activeCategory === "favorite") return favoriteIds.includes(t.id);
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
      }),
    [subjectTemplates, activeCategory, searchQuery, favoriteIds, recentIds],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: subjectTemplates.length };
    for (const t of subjectTemplates) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    counts.recent = subjectTemplates.filter((t) => recentIds.includes(t.id)).length;
    counts.favorite = subjectTemplates.filter((t) => favoriteIds.includes(t.id)).length;
    return counts;
  }, [subjectTemplates, favoriteIds, recentIds]);

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-slate-500 mb-4">科目不存在</p>
          <button onClick={() => navigate("/")} className="text-indigo-500 font-medium hover:underline">返回首页</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            全部科目
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"/>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${subject.gradient} text-white text-sm`}>
              {subject.icon}
            </div>
            <h1 className="font-bold text-lg">{subject.name}</h1>
            <span className="text-sm text-slate-400">{subjectTemplates.length} 个算法模板</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 搜索栏 */}
        <div className="max-w-md mb-8">
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-slate-400 mt-2">找到 {filteredTemplates.length} 个结果</p>
          )}
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {categories.map((cat) => {
            const count = categoryCounts[cat.key] ?? 0;
            if (cat.key !== "all" && cat.key !== "recent" && cat.key !== "favorite" && count === 0) return null;
            if ((cat.key === "recent" || cat.key === "favorite") && count === 0) return null;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-1.5 ${
                  activeCategory === cat.key
                    ? `bg-gradient-to-r ${subject.gradient} text-white border-transparent`
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400/40"
                }`}
              >
                {cat.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 模板卡片 */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg mb-2">暂无匹配的算法模板</p>
            <p className="text-sm">尝试其他分类或搜索关键词</p>
          </div>
        ) : (
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
                  <span className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < template.examFrequency ? "#f59e0b" : "#e2e8f0"}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(template.id); }}
                    className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label={isFavorite(template.id) ? "取消收藏" : "收藏"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24"
                      fill={isFavorite(template.id) ? "#f59e0b" : "none"}
                      stroke={isFavorite(template.id) ? "#f59e0b" : "currentColor"}
                      strokeWidth="2"
                      className="text-slate-300 dark:text-slate-600"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
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
        )}
      </div>
    </div>
  );
}
