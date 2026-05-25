import { useState, useRef, useEffect } from "react";
import type { TraceFrame, RuntimeValue } from "../../types";
import type { ExamReference } from "../../data/examReferences";
import ExamQuestion from "./ExamQuestion";

interface StateInspectorProps {
  frame: TraceFrame | null;
  totalSteps: number;
  frames: TraceFrame[];
  goToStep: (step: number) => void;
  examRefs?: ExamReference[];
}

const eventTypeConfig: Record<
  string,
  { label: string; color: string; svg: string }
> = {
  CREATE_NODE: {
    label: "创建节点",
    color: "#4f46e5",
    svg: '<circle cx="12" cy="12" r="8" stroke-width="2" fill="none"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  },
  DELETE_NODE: {
    label: "删除节点",
    color: "#ef4444",
    svg: '<circle cx="12" cy="12" r="8" stroke-width="2" fill="none"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
  },
  LINK_NODE: {
    label: "连接节点",
    color: "#10b981",
    svg: '<circle cx="6" cy="12" r="3" fill="currentColor"/><circle cx="18" cy="12" r="3" fill="currentColor"/><line x1="9" y1="12" x2="15" y2="12" stroke-width="2"/>',
  },
  UNLINK_NODE: {
    label: "断开连接",
    color: "#ef4444",
    svg: '<circle cx="6" cy="12" r="3" fill="currentColor"/><circle cx="18" cy="12" r="3" fill="currentColor"/><line x1="9" y1="12" x2="15" y2="12" stroke-width="2" stroke-dasharray="2 2"/>',
  },
  VISIT_NODE: {
    label: "访问节点",
    color: "#4f46e5",
    svg: '<circle cx="12" cy="12" r="8" stroke-width="2" fill="none"/><polyline points="10 12 11.5 13.5 14.5 10.5" stroke-width="2" fill="none"/>',
  },
  COMPARE: {
    label: "比较",
    color: "#f59e0b",
    svg: '<circle cx="7" cy="12" r="4" stroke-width="2" fill="none"/><circle cx="17" cy="12" r="4" stroke-width="2" fill="none"/><line x1="11" y1="10" x2="13" y2="10" stroke-width="2"/><line x1="11" y1="14" x2="13" y2="14" stroke-width="2"/>',
  },
  ROTATE_LEFT: {
    label: "左旋",
    color: "#7c3aed",
    svg: '<path d="M16 8 A6 6 0 0 1 16 16" stroke-width="2" fill="none"/><polyline points="14 14 16 16 18 14" stroke-width="2" fill="none"/>',
  },
  ROTATE_RIGHT: {
    label: "右旋",
    color: "#7c3aed",
    svg: '<path d="M8 8 A6 6 0 0 0 8 16" stroke-width="2" fill="none"/><polyline points="6 14 8 16 10 14" stroke-width="2" fill="none"/>',
  },
  RECOLOR: {
    label: "变色",
    color: "#7c3aed",
    svg: '<circle cx="12" cy="12" r="8" stroke-width="2" fill="none"/><path d="M9 12 Q12 6 15 12 Q12 18 9 12 Z" fill="currentColor" opacity="0.3"/>',
  },
  RELAX_EDGE: {
    label: "松弛边",
    color: "#10b981",
    svg: '<line x1="6" y1="12" x2="18" y2="12" stroke-width="2"/><polyline points="15 9 18 12 15 15" stroke-width="2" fill="none"/><line x1="12" y1="8" x2="12" y2="6" stroke-width="1.5" stroke-dasharray="1 1"/>',
  },
  UPDATE_DISTANCE: {
    label: "更新距离",
    color: "#f59e0b",
    svg: '<polyline points="6 18 6 12 18 12 18 6" stroke-width="2" fill="none"/><polyline points="15 6 18 6 18 9" stroke-width="2" fill="none"/>',
  },
  PUSH: {
    label: "入栈",
    color: "#4f46e5",
    svg: '<rect x="7" y="6" width="10" height="14" rx="1" stroke-width="2" fill="none"/><polyline points="12 10 12 16" stroke-width="2"/><polyline points="10 13 12 16 14 13" stroke-width="2" fill="none"/>',
  },
  POP: {
    label: "出栈",
    color: "#ef4444",
    svg: '<rect x="7" y="6" width="10" height="14" rx="1" stroke-width="2" fill="none"/><polyline points="12 16 12 10" stroke-width="2"/><polyline points="10 13 12 10 14 13" stroke-width="2" fill="none"/>',
  },
  ENQUEUE: {
    label: "入队",
    color: "#4f46e5",
    svg: '<line x1="6" y1="8" x2="6" y2="16" stroke-width="2"/><line x1="18" y1="8" x2="18" y2="16" stroke-width="2"/><line x1="6" y1="12" x2="18" y2="12" stroke-width="2"/><polyline points="10 10 6 12 10 14" stroke-width="2" fill="none"/>',
  },
  DEQUEUE: {
    label: "出队",
    color: "#ef4444",
    svg: '<line x1="6" y1="8" x2="6" y2="16" stroke-width="2"/><line x1="18" y1="8" x2="18" y2="16" stroke-width="2"/><line x1="6" y1="12" x2="18" y2="12" stroke-width="2"/><polyline points="14 10 18 12 14 14" stroke-width="2" fill="none"/>',
  },
  SWAP: {
    label: "交换",
    color: "#f59e0b",
    svg: '<polyline points="8 6 16 6" stroke-width="2"/><polyline points="14 4 16 6 14 8" stroke-width="2" fill="none"/><polyline points="16 18 8 18" stroke-width="2"/><polyline points="10 16 8 18 10 20" stroke-width="2" fill="none"/>',
  },
  MARK_FINAL: {
    label: "标记完成",
    color: "#f59e0b",
    svg: '<circle cx="12" cy="12" r="8" stroke-width="2" fill="none"/><polyline points="9 12 11.5 14.5 15.5 9.5" stroke-width="2.5" fill="none"/>',
  },
  CHECK_INVARIANT: {
    label: "检查性质",
    color: "#7c3aed",
    svg: '<circle cx="12" cy="12" r="8" stroke-width="2" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="currentColor">?</text>',
  },
  SPLIT_NODE: {
    label: "分裂节点",
    color: "#7c3aed",
    svg: '<rect x="5" y="8" width="14" height="8" rx="2" stroke-width="2" fill="none"/><line x1="12" y1="8" x2="12" y2="16" stroke-width="2" stroke-dasharray="2 1"/>',
  },
  PROMOTE_KEY: {
    label: "提升关键字",
    color: "#7c3aed",
    svg: '<rect x="6" y="14" width="12" height="6" rx="1.5" stroke-width="2" fill="none"/><polyline points="12 14 12 8" stroke-width="2"/><polyline points="10 10 12 7 14 10" stroke-width="2" fill="none"/>',
  },
  INIT_DISTANCE: {
    label: "初始化距离",
    color: "#4f46e5",
    svg: '<text x="12" y="16" text-anchor="middle" font-size="13" font-weight="bold" fill="currentColor">0</text><circle cx="12" cy="12" r="9" stroke-width="2" fill="none"/>',
  },
  FILL_CELL: {
    label: "填入单元格",
    color: "#10b981",
    svg: '<rect x="5" y="5" width="14" height="14" rx="2" stroke-width="2" fill="none"/><line x1="9" y1="12" x2="15" y2="12" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="15" stroke-width="2"/>',
  },
  BACKTRACK: {
    label: "回溯",
    color: "#7c3aed",
    svg: '<polyline points="18 6 6 6 6 18" stroke-width="2" fill="none"/><polyline points="8 16 6 18 4 16" stroke-width="2" fill="none"/>',
  },
  DISTRIBUTE: {
    label: "分配",
    color: "#4f46e5",
    svg: '<circle cx="6" cy="12" r="3" fill="currentColor"/><polyline points="9 10 14 7" stroke-width="1.5"/><polyline points="9 12 14 12" stroke-width="1.5"/><polyline points="9 14 14 17" stroke-width="1.5"/><circle cx="16" cy="7" r="2" stroke-width="1.5" fill="none"/><circle cx="16" cy="12" r="2" stroke-width="1.5" fill="none"/><circle cx="16" cy="17" r="2" stroke-width="1.5" fill="none"/>',
  },
  COLLECT: {
    label: "收集",
    color: "#10b981",
    svg: '<circle cx="16" cy="12" r="3" fill="currentColor"/><polyline points="14 7 9 10" stroke-width="1.5"/><polyline points="14 12 9 12" stroke-width="1.5"/><polyline points="14 17 9 14" stroke-width="1.5"/><circle cx="7" cy="7" r="2" stroke-width="1.5" fill="none"/><circle cx="7" cy="12" r="2" stroke-width="1.5" fill="none"/><circle cx="7" cy="17" r="2" stroke-width="1.5" fill="none"/>',
  },
  SELECT_MIN: {
    label: "选择最小",
    color: "#f59e0b",
    svg: '<circle cx="12" cy="12" r="8" stroke-width="2" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">min</text>',
  },
  UNION: {
    label: "合并",
    color: "#10b981",
    svg: '<circle cx="7" cy="10" r="4" stroke-width="2" fill="none"/><circle cx="17" cy="10" r="4" stroke-width="2" fill="none"/><polyline points="12 10 12 17" stroke-width="2"/><circle cx="12" cy="17" r="2.5" fill="currentColor"/>',
  },
  FIND: {
    label: "查找",
    color: "#4f46e5",
    svg: '<circle cx="10" cy="10" r="6" stroke-width="2" fill="none"/><line x1="14" y1="14" x2="18" y2="18" stroke-width="2.5"/><polyline points="8 10 10 12 13 8" stroke-width="2" fill="none"/>',
  },
};

function formatValue(rv: RuntimeValue): string {
  return rv.display;
}

export default function StateInspector({ frame, totalSteps, frames, goToStep, examRefs }: StateInspectorProps) {
  const currentStep = frame?.step ?? -1;
  const event = frame?.event;
  const snapshot = frame?.snapshot;


  const eventConfig = event
    ? eventTypeConfig[event.type] ?? {
        label: event.type,
        color: "#64748b",
        svg: '<circle cx="12" cy="12" r="3" fill="currentColor"/>',
      }
    : null;

  const progress = totalSteps > 0 && currentStep >= 0
    ? ((currentStep + 1) / totalSteps) * 100
    : 0;

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      const active = logRef.current.querySelector('[data-active="true"]');
      if (active) {
        active.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [currentStep]);

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4">
      {/* 步骤进度 */}
      <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
            执行进度
          </span>
          <span className="text-sm font-bold tabular-nums">
            {currentStep >= 0 ? (
              <>
                <span className="text-indigo-500">{currentStep + 1}</span>
                <span className="text-slate-400 dark:text-slate-500"> / {totalSteps}</span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">- / -</span>
            )}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            style={{
              width: `${progress}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* 操作回放 Trace Log */}
      {frames.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-semibold tracking-wide mb-3 text-slate-400 dark:text-slate-500">
            操作回放
          </div>
          <div
            ref={logRef}
            className="max-h-52 overflow-y-auto flex flex-col gap-0.5 rounded-lg"
          >
            {frames.map((f, i) => {
              const ev = f.event;
              const cfg = eventTypeConfig[ev.type] ?? {
                label: ev.type,
                color: "#64748b",
                svg: '<circle cx="12" cy="12" r="3" fill="currentColor"/>',
              };
              const isActive = i === currentStep;
              return (
                <button
                  key={i}
                  data-active={isActive}
                  onClick={() => goToStep(i)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-xs w-full ${
                    isActive
                      ? "bg-indigo-500/10 dark:bg-indigo-500/20 ring-1 ring-indigo-500/30"
                      : "hover:bg-slate-200/60 dark:hover:bg-slate-700/40"
                  }`}
                >
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded shrink-0"
                    style={{ background: isActive ? cfg.color : "transparent", color: isActive ? "#fff" : cfg.color }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dangerouslySetInnerHTML={{ __html: cfg.svg }}
                    />
                  </span>
                  <span className={`font-mono tabular-nums w-5 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                    {i + 1}
                  </span>
                  <span className={`truncate ${isActive ? "text-indigo-700 dark:text-indigo-300 font-semibold" : "text-slate-600 dark:text-slate-400"}`}>
                    {ev.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 当前事件 */}
      {event && eventConfig && (
        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-semibold tracking-wide mb-3 text-slate-400 dark:text-slate-500">
            当前事件
          </div>
          <div className="flex items-start gap-3">
            {/* SVG 图标 */}
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
              style={{ background: eventConfig.color, color: "#fff" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: eventConfig.svg }}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold leading-snug">
                {event.title}
              </div>
              <div
                className="text-xs mt-1.5 leading-relaxed text-slate-600 dark:text-slate-300"
              >
                {event.description}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 变量状态 */}
      {snapshot?.variables && Object.keys(snapshot.variables).length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-semibold tracking-wide mb-3 text-slate-400 dark:text-slate-500">
            变量状态
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs text-slate-400 dark:text-slate-500"
              >
                <th className="pb-2 font-semibold">变量</th>
                <th className="pb-2 font-semibold">值</th>
                <th className="pb-2 font-semibold">类型</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(snapshot.variables).map(([name, rv], idx) => (
                <tr
                  key={name}
                  className={`border-t border-slate-200 dark:border-slate-800 ${idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-800/30"}`}
                >
                  <td className="py-2 font-mono text-xs font-medium">{name}</td>
                  <td className="py-2 font-mono text-xs font-semibold text-indigo-500">
                    {formatValue(rv)}
                  </td>
                  <td
                    className="py-2 text-xs text-slate-400 dark:text-slate-500"
                  >
                    {rv.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 不变量检查 */}
      {snapshot?.invariants && snapshot.invariants.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-semibold tracking-wide mb-3 text-slate-400 dark:text-slate-500">
            不变量检查
          </div>
          <div className="flex flex-col gap-2">
            {snapshot.invariants.map((inv, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 text-xs py-1.5 px-2 rounded-lg ${inv.passed ? "bg-emerald-500/5" : "bg-red-500/5"}`}
              >
                {inv.passed ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
                <span className="font-medium" style={{ color: inv.passed ? "#10b981" : "#ef4444" }}>
                  {inv.name}
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  {inv.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 408 真题关联 */}
      {examRefs && examRefs.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-semibold tracking-wide mb-3 text-slate-400 dark:text-slate-500">
            408 真题关联
          </div>
          <div className="flex flex-col gap-1.5">
            {examRefs.map((ref, i) => (
              <ExamQuestion key={i} data={ref} />
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!event && (
        <div
          className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-slate-400 dark:text-slate-500"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="text-sm">运行代码后查看执行状态</span>
        </div>
      )}
    </div>
  );
}
