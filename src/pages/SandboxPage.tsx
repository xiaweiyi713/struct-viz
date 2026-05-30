import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useSandboxStore } from "../stores/sandboxStore";
import { useHomeStore } from "../stores/homeStore";
import TopNav from "../components/layout/TopNav";
import ResizableLayout from "../components/layout/ResizableLayout";
import MobileTabLayout from "../components/layout/MobileTabLayout";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useExecutorWorker } from "../core/worker/useExecutorWorker";
import CodeEditor from "../components/editor/CodeEditor";
import TreeVisualizer from "../components/visualizers/TreeVisualizer";
import GraphVisualizer from "../components/visualizers/GraphVisualizer";
import ArrayVisualizer from "../components/visualizers/ArrayVisualizer";
import StringVisualizer from "../components/visualizers/StringVisualizer";
import HashTableVisualizer from "../components/visualizers/HashTableVisualizer";
import MultiArrayVisualizer from "../components/visualizers/MultiArrayVisualizer";
import MatrixVisualizer from "../components/visualizers/MatrixVisualizer";
import StateInspector from "../components/inspector/StateInspector";
import PseudocodePanel from "../components/inspector/PseudocodePanel";
import PlaybackControls from "../components/timeline/PlaybackControls";
import { getTemplateById, templates } from "../data/templates";
import { subjects } from "../data/subjects";
import type { VisualStructure, TraceFrame } from "../types";

function getStructureFromFrame(frame: TraceFrame | null): {
  structure: VisualStructure | null;
  name: string;
} {
  if (!frame) return { structure: null, name: "" };
  const entries = Object.entries(frame.snapshot.structures);
  if (entries.length === 0) return { structure: null, name: "" };
  return { structure: entries[0][1], name: entries[0][0] };
}

function VisualContent({
  structure,
  highlightedNodes,
  width,
  height,
}: {
  structure: VisualStructure | null;
  highlightedNodes: string[];
  width: number;
  height: number;
}) {
  if (!structure) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
        <div className="text-center">
          <svg
            className="mx-auto mb-3 opacity-30"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="5" r="3" />
            <circle cx="5" cy="19" r="3" />
            <circle cx="19" cy="19" r="3" />
            <line x1="12" y1="8" x2="5" y2="16" />
            <line x1="12" y1="8" x2="19" y2="16" />
          </svg>
          <div className="text-sm">选择模板并运行代码</div>
          <div className="text-xs mt-1">查看数据结构的逐步执行过程</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {structure.type === "tree" && (
        <TreeVisualizer
          nodes={structure.nodes}
          rootId={structure.rootId}
          highlightedNodes={highlightedNodes}
          width={width}
          height={height}
        />
      )}
      {structure.type === "graph" && (
        <GraphVisualizer
          nodes={structure.nodes}
          edges={structure.edges}
          highlightedNodes={highlightedNodes}
          width={width}
          height={height}
        />
      )}
      {(structure.type === "stack" || structure.type === "array" || structure.type === "queue") && (
        <ArrayVisualizer
          items={structure.items}
          mode={structure.type}
          width={width}
          height={height}
        />
      )}
      {structure.type === "string" && (
        <StringVisualizer
          textChars={structure.textChars}
          patternChars={structure.patternChars}
          nextArray={structure.nextArray}
          textIndex={structure.textIndex}
          patternIndex={structure.patternIndex}
          width={width}
          height={height}
        />
      )}
      {structure.type === "hashtable" && (
        <HashTableVisualizer
          buckets={structure.buckets}
          tableSize={structure.tableSize}
          hashFunc={structure.hashFunc}
          width={width}
          height={height}
        />
      )}
      {structure.type === "multiarray" && (
        <MultiArrayVisualizer
          arrays={structure.arrays}
          labels={structure.labels}
          width={width}
          height={height}
        />
      )}
      {structure.type === "matrix" && (
        <MatrixVisualizer
          rows={structure.rows}
          cols={structure.cols}
          cells={structure.cells}
          rowHeaders={structure.rowHeaders}
          colHeaders={structure.colHeaders}
          width={width}
          height={height}
        />
      )}
    </>
  );
}

function useVisualSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 600, height: 400 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

const difficultyBadge: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-500",
  medium: "bg-amber-500/10 text-amber-500",
  hard: "bg-red-500/10 text-red-500",
};

export default function SandboxPage() {
  const [searchParams] = useSearchParams();
  const store = useSandboxStore();
  const {
    code,
    setCode,
    frames,
    currentStep,
    isPlaying,
    speed,
    run,
    nextStep,
    prevStep,
    goToStep,
    play,
    pause,
    reset,
    setSpeed,
    setTemplate,
    currentFrame,
    totalSteps,
    selectedTemplate,
    compareMode,
    toggleCompareMode,
    compareCode,
    setCompareCode,
    compareFrames,
    compareCurrentStep,
    compareIsPlaying,
    runCompare,
    compareNextStep,
    comparePrevStep,
    compareGoToStep,
    comparePlay,
    comparePause,
    compareCurrentFrame,
    compareTotalSteps,
    compareTemplate,
    setCompareTemplate,
    compareReset,
  } = store;

  const [errors, setErrors] = useState<string[]>([]);
  const [parseErrors, setParseErrors] = useState<{ line: number; column: number; message: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [compareErrors, setCompareErrors] = useState<string[]>([]);
  const [compareParseErrors, setCompareParseErrors] = useState<{ line: number; column: number; message: string }[]>([]);
  const [compareDropdownOpen, setCompareDropdownOpen] = useState(false);
  const compareDropdownRef = useRef<HTMLDivElement>(null);

  const visualAreaRef = useRef<HTMLDivElement>(null);
  const compareVisualRef = useRef<HTMLDivElement>(null);
  const visualSize = useVisualSize(visualAreaRef);
  const compareVisualSize = useVisualSize(compareVisualRef);

  // 对比模板下拉外部点击关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (compareDropdownRef.current && !compareDropdownRef.current.contains(e.target as Node)) {
        setCompareDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelectCompareTemplate = useCallback((templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    if (t) {
      setCompareTemplate(templateId);
      setCompareCode(t.code);
      compareReset();
      setCompareErrors([]);
      setCompareParseErrors([]);
    }
    setCompareDropdownOpen(false);
  }, [setCompareTemplate, setCompareCode, compareReset]);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // 从 URL 参数加载模板
  const { addRecent } = useHomeStore();

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (templateId) {
      const template = getTemplateById(templateId);
      if (template) {
        setTemplate(templateId);
        setCode(template.code);
        reset();
        // 加载 URL 指定的模板属于响应外部状态（路由参数）的合理副作用，
        // 这里主动清空上一次运行残留的错误提示。
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setErrors([]);
        setParseErrors([]);
        addRecent(templateId);
      }
    }
  }, [searchParams, setCode, setTemplate, reset, addRecent]);

  // 主侧自动播放
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(
      () => {
        const total = totalSteps();
        const cur = useSandboxStore.getState().currentStep;
        if (cur >= total - 1) {
          pause();
          return;
        }
        nextStep();
      },
      1000 / speed,
    );
    return () => clearInterval(interval);
  }, [isPlaying, speed, totalSteps, nextStep, pause]);

  // 对比侧自动播放
  useEffect(() => {
    if (!compareIsPlaying) return;
    const interval = setInterval(
      () => {
        const total = compareTotalSteps();
        const cur = useSandboxStore.getState().compareCurrentStep;
        if (cur >= total - 1) {
          comparePause();
          return;
        }
        compareNextStep();
      },
      1000 / speed,
    );
    return () => clearInterval(interval);
  }, [compareIsPlaying, speed, compareTotalSteps, compareNextStep, comparePause]);

  const workerExecute = useExecutorWorker();
  const compareWorkerExecute = useExecutorWorker();

  const handleRun = useCallback(async () => {
    setErrors([]);
    setParseErrors([]);
    setIsRunning(true);
    const result = await workerExecute.execute(code);
    setIsRunning(false);
    if (result.errors) {
      setErrors(result.errors);
      setParseErrors(result.parseErrors ?? []);
      return;
    }
    if (result.frames) {
      run(result.frames);
    }
  }, [code, run, workerExecute]);

  const handleCompareRun = useCallback(async () => {
    setCompareErrors([]);
    setCompareParseErrors([]);
    const result = await compareWorkerExecute.execute(compareCode);
    if (result.errors) {
      setCompareErrors(result.errors);
      setCompareParseErrors(result.parseErrors ?? []);
      return;
    }
    if (result.frames) {
      runCompare(result.frames);
    }
  }, [compareCode, runCompare, compareWorkerExecute]);

  const togglePlay = useCallback(
    () => (isPlaying ? pause() : play()),
    [isPlaying, play, pause],
  );
  useKeyboardShortcuts({
    onTogglePlay: togglePlay,
    onNext: nextStep,
    onPrev: prevStep,
    onReset: reset,
    onSetSpeed: setSpeed,
    onRun: handleRun,
  });

  const frame = currentFrame();
  const { structure } = getStructureFromFrame(frame);
  const total = totalSteps();
  const currentLine = frame?.event?.codeLine;
  const highlightedNodes = frame?.event?.targets ?? [];

  const compareFrame = compareCurrentFrame();
  const { structure: compareStructure } = getStructureFromFrame(compareFrame);
  const compareLine = compareFrame?.event?.codeLine;
  const compareHighlighted = compareFrame?.event?.targets ?? [];

  const currentTemplate = selectedTemplate ? getTemplateById(selectedTemplate) : null;
  const currentCompareTemplate = compareTemplate ? getTemplateById(compareTemplate) : null;

  // --- 面板 ---

  const editorPanel = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-slate-200 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          StructScript 编辑器
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCompareMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              compareMode
                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            对比
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-all ${
              isRunning
                ? "bg-slate-400 cursor-wait"
                : "bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)]"
            }`}
          >
            {isRunning ? (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            {isRunning ? "执行中" : "运行"}
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <CodeEditor code={code} onChange={setCode} currentLine={currentLine} parseErrors={parseErrors} />
      </div>
    </div>
  );

  const pseudocodePanel = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="px-3 py-2 shrink-0 text-xs font-medium border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
        伪代码
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <PseudocodePanel template={currentTemplate ?? null} frame={frame} />
      </div>
    </div>
  );

  const structureTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      tree: "树结构", graph: "图结构", stack: "栈结构", array: "数组结构",
      queue: "队列", string: "字符串匹配", hashtable: "哈希表",
      multiarray: "多数组", matrix: "动态规划表",
    };
    return map[type] ?? type;
  };

  const visualPanel = (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="px-3 py-2 shrink-0 text-xs font-medium flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
        <span>可视化</span>
        {structure && <span>{structureTypeLabel(structure.type)}</span>}
      </div>
      <div ref={visualAreaRef} className="flex-1 min-h-0 overflow-hidden">
        <VisualContent structure={structure} highlightedNodes={highlightedNodes} width={visualSize.width} height={visualSize.height} />
      </div>
    </div>
  );

  const compareTotal = compareTotalSteps();

  const inspectorPanel = compareMode ? (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="px-3 py-2 shrink-0 text-xs font-medium border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
        状态检查
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
        <div className="overflow-y-auto">
          <div className="text-[10px] font-semibold px-3 py-1.5 text-indigo-500 bg-indigo-500/5">主侧</div>
          <StateInspector frame={frame} totalSteps={total} frames={frames} goToStep={goToStep} examRefs={currentTemplate?.examReferences} />
        </div>
        <div className="overflow-y-auto">
          <div className="text-[10px] font-semibold px-3 py-1.5 text-violet-500 bg-violet-500/5">对比侧</div>
          <StateInspector frame={compareFrame} totalSteps={compareTotal} frames={compareFrames} goToStep={compareGoToStep} examRefs={currentCompareTemplate?.examReferences} />
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="px-3 py-2 shrink-0 text-xs font-medium border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
        状态检查
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <StateInspector frame={frame} totalSteps={total} frames={frames} goToStep={goToStep} examRefs={currentTemplate?.examReferences} />
      </div>
    </div>
  );

  // --- 对比模式面板 ---

  const activeCompareTemplate = compareTemplate ? templates.find((t) => t.id === compareTemplate) : null;

  const compareEditorPanel = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div className="relative" ref={compareDropdownRef}>
          <button
            onClick={() => setCompareDropdownOpen(!compareDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-violet-600 dark:text-violet-400 hover:border-violet-400/40 transition-all"
          >
            <span>{activeCompareTemplate ? activeCompareTemplate.name : "选择模板"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-200 ${compareDropdownOpen ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {compareDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-72 rounded-xl z-50 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="max-h-80 overflow-y-auto py-1">
                {subjects.map((subject) => {
                  const subjectTemplates = templates.filter((t) => t.subject === subject.id);
                  if (subjectTemplates.length === 0) return null;
                  return (
                    <div key={subject.id}>
                      <div className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider ${subject.text}`}>
                        {subject.icon} {subject.name}
                      </div>
                      {subject.categories.map((cat) => {
                        const catTemplates = subjectTemplates.filter((t) => t.category === cat.key);
                        if (catTemplates.length === 0) return null;
                        return (
                          <div key={cat.key}>
                            <div className="px-4 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {cat.label}
                            </div>
                            {catTemplates.map((t) => (
                              <button
                                key={t.id}
                                className={`w-full text-left px-4 py-2 flex items-center gap-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${compareTemplate === t.id ? "bg-violet-500/5" : ""}`}
                                onClick={() => handleSelectCompareTemplate(t.id)}
                              >
                                <span className="font-medium">{t.name}</span>
                                <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${difficultyBadge[t.difficulty]}`}>
                                  {t.difficulty === "easy" ? "简" : t.difficulty === "medium" ? "中" : "难"}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleCompareRun}
          className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-[0_4px_15px_rgba(139,92,246,0.3)] transition-all flex items-center gap-1.5 shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          运行
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {compareCode ? (
          <CodeEditor code={compareCode} onChange={setCompareCode} currentLine={compareLine} parseErrors={compareParseErrors} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
            点击上方「选择模板」或直接输入代码
          </div>
        )}
      </div>
    </div>
  );

  const compareVisualPanel = (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="px-3 py-2 shrink-0 text-xs font-medium flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-violet-400 dark:text-violet-500">
        <span>对比可视化</span>
        {compareStructure && <span>{structureTypeLabel(compareStructure.type)}</span>}
      </div>
      <div ref={compareVisualRef} className="flex-1 min-h-0 overflow-hidden">
        <VisualContent structure={compareStructure} highlightedNodes={compareHighlighted} width={compareVisualSize.width} height={compareVisualSize.height} />
      </div>
    </div>
  );

  // --- 布局 ---

  const desktopPanels = compareMode
    ? [
        { key: "editor", minWidth: 180, defaultPercent: 18 },
        { key: "visual", minWidth: 200, defaultPercent: 25 },
        { key: "compareEditor", minWidth: 180, defaultPercent: 18 },
        { key: "compareVisual", minWidth: 200, defaultPercent: 25 },
        { key: "inspector", minWidth: 180, defaultPercent: 14 },
      ]
    : [
        { key: "editor", minWidth: 220, defaultPercent: 25 },
        { key: "pseudocode", minWidth: 180, defaultPercent: 18 },
        { key: "visual", minWidth: 280, defaultPercent: 32 },
        { key: "inspector", minWidth: 220, defaultPercent: 25 },
      ];

  const mobileTabs = [
    {
      key: "code",
      label: "代码",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      key: "visual",
      label: "可视化",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="3" />
          <circle cx="5" cy="19" r="3" />
          <circle cx="19" cy="19" r="3" />
          <line x1="12" y1="8" x2="5" y2="16" />
          <line x1="12" y1="8" x2="19" y2="16" />
        </svg>
      ),
    },
    {
      key: "state",
      label: "状态",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      key: "pseudocode",
      label: "伪代码",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <TopNav />

      {/* 错误提示 */}
      {(errors.length > 0 || compareErrors.length > 0) && (
        <div className="px-4 py-2 text-sm flex items-center gap-2 bg-red-500/95 backdrop-blur-sm text-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{errors[0] || compareErrors[0]}</span>
          {(errors.length > 1 || compareErrors.length > 1) && (
            <span className="opacity-75">（共 {(errors.length || 0) + (compareErrors.length || 0)} 个错误）</span>
          )}
          <button
            className="ml-auto opacity-75 hover:opacity-100"
            onClick={() => { setErrors([]); setCompareErrors([]); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* 主内容区域 */}
      {isMobile ? (
        <MobileTabLayout tabs={mobileTabs}>
          {editorPanel}
          {visualPanel}
          {inspectorPanel}
          {pseudocodePanel}
        </MobileTabLayout>
      ) : compareMode ? (
        <ResizableLayout panels={desktopPanels} storageKey="sandbox-compare-panels">
          {editorPanel}
          {visualPanel}
          {compareEditorPanel}
          {compareVisualPanel}
          {inspectorPanel}
        </ResizableLayout>
      ) : (
        <ResizableLayout panels={desktopPanels} storageKey="sandbox-panels">
          {editorPanel}
          {pseudocodePanel}
          {visualPanel}
          {inspectorPanel}
        </ResizableLayout>
      )}

      {/* 底部：播放控制 */}
      {compareMode ? (
        <div className="flex border-t border-slate-200 dark:border-slate-800">
          <div className="flex-1">
            <PlaybackControls
              currentStep={currentStep}
              totalSteps={total}
              isPlaying={isPlaying}
              speed={speed}
              onPlay={play}
              onPause={pause}
              onNext={nextStep}
              onPrev={prevStep}
              onReset={reset}
              onGoToStep={goToStep}
              onSpeedChange={setSpeed}
            />
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex-1">
            <PlaybackControls
              currentStep={compareCurrentStep}
              totalSteps={compareTotal}
              isPlaying={compareIsPlaying}
              speed={speed}
              onPlay={comparePlay}
              onPause={comparePause}
              onNext={compareNextStep}
              onPrev={comparePrevStep}
              onReset={compareReset}
              onGoToStep={compareGoToStep}
              onSpeedChange={setSpeed}
            />
          </div>
        </div>
      ) : (
        <PlaybackControls
          currentStep={currentStep}
          totalSteps={total}
          isPlaying={isPlaying}
          speed={speed}
          onPlay={play}
          onPause={pause}
          onNext={nextStep}
          onPrev={prevStep}
          onReset={reset}
          onGoToStep={goToStep}
          onSpeedChange={setSpeed}
        />
      )}
    </div>
  );
}
