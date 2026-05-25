import type { AlgorithmTemplate } from "../../data/templates";
import type { TraceFrame } from "../../types";

interface PseudocodePanelProps {
  template: AlgorithmTemplate | null;
  frame: TraceFrame | null;
}

export default function PseudocodePanel({ template, frame }: PseudocodePanelProps) {
  const pseudocode = template?.pseudocode;
  const lineMap = template?.pseudocodeLineMap;

  if (!template) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500 p-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span className="text-sm">选择模板后查看伪代码</span>
      </div>
    );
  }

  if (!pseudocode) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-semibold tracking-wide mb-3 text-slate-400 dark:text-slate-500">
            {template.name}
          </div>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {template.description}
          </p>
        </div>
      </div>
    );
  }

  const lines = pseudocode.split("\n");
  const codeLine = frame?.event?.codeLine;
  const activePseudoLine = codeLine != null && lineMap ? lineMap[codeLine] : undefined;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
        <div className="text-xs font-semibold tracking-wide mb-3 text-slate-400 dark:text-slate-500">
          伪代码
        </div>
        <div className="flex flex-col">
          {lines.map((line, i) => {
            const isActive = i === activePseudoLine;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 px-2 py-1 rounded-md text-xs leading-relaxed font-mono transition-colors ${
                  isActive
                    ? "bg-indigo-500/10 dark:bg-indigo-500/20 ring-1 ring-indigo-500/30"
                    : ""
                }`}
              >
                <span
                  className={`w-5 shrink-0 text-right tabular-nums select-none ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-slate-400 dark:text-slate-600"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`whitespace-pre-wrap break-all ${
                    isActive
                      ? "text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
