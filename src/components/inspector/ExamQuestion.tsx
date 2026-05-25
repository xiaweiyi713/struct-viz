import { useState } from "react";

export interface ExamQuestionData {
  year: number;
  question: string;
  topic: string;
  type: "choice" | "essay";
  stem: string;
  options?: string[];
  answer: string;
  explanation: string;
}

interface ExamQuestionProps {
  data: ExamQuestionData;
}

export default function ExamQuestion({ data }: ExamQuestionProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const correctIdx = data.type === "choice" && data.options
    ? (() => {
        const byPrefix = data.options.findIndex((o) => o.startsWith(data.answer + ".") || o.startsWith(data.answer + "、") || o.startsWith(data.answer + " "));
        if (byPrefix !== -1) return byPrefix;
        const idx = data.answer.charCodeAt(0) - "A".charCodeAt(0);
        return idx >= 0 && idx < data.options.length ? idx : -1;
      })()
    : -1;
  const answered = selectedIdx !== null;
  const isCorrect = selectedIdx === correctIdx;

  return (
    <div className="rounded-lg bg-indigo-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-xs py-2.5 px-3 text-left hover:bg-indigo-500/10 transition-colors"
      >
        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold tabular-nums shrink-0">
          {data.year}
        </span>
        <span className="text-slate-600 dark:text-slate-300 font-medium shrink-0">{data.question}</span>
        <span className="text-slate-400 dark:text-slate-500 truncate flex-1">{data.topic}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 text-xs leading-relaxed border-t border-indigo-500/10">
          <p className="text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-line">{data.stem}</p>

          {data.type === "choice" && data.options && (
            <div className="flex flex-col gap-1.5 mb-3">
              {data.options.map((opt, i) => {
                const isSelected = selectedIdx === i;
                const isCorrectOption = i === correctIdx;
                let cls = "border-slate-200 dark:border-slate-700 hover:border-indigo-400/40 hover:bg-indigo-500/5 text-slate-600 dark:text-slate-300";

                if (answered) {
                  if (isCorrectOption) {
                    cls = "border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
                  } else if (isSelected && !isCorrectOption) {
                    cls = "border-red-400 bg-red-500/10 text-red-700 dark:text-red-400";
                  } else {
                    cls = "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60";
                  }
                } else if (isSelected) {
                  cls = "border-indigo-400 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400";
                }

                return (
                  <button
                    key={i}
                    onClick={() => { if (!answered) setSelectedIdx(i); }}
                    disabled={answered}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all duration-150 ${cls}`}
                  >
                    {opt}
                    {answered && isCorrectOption && (
                      <span className="ml-2 text-emerald-500 font-bold">✓ 正确</span>
                    )}
                    {answered && isSelected && !isCorrectOption && (
                      <span className="ml-2 text-red-500 font-bold">✗</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {data.type === "choice" && answered && (
            <div className="mb-2 flex items-center gap-2">
              <span className={`px-2 py-1 rounded-md font-semibold text-xs ${
                isCorrect
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}>
                {isCorrect ? "回答正确" : `正确答案: ${data.answer}`}
              </span>
            </div>
          )}

          {(data.type === "essay" || answered) && (
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-medium mb-2 transition-colors"
            >
              {showExplanation ? "收起详细解析 ▲" : "查看详细解析 ▼"}
            </button>
          )}

          {showExplanation && (
            <div className="mt-2 p-3 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {data.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
