import { useRef, useCallback, useEffect, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useSandboxStore } from "../../stores/sandboxStore";
import { registerStructScriptLanguage } from "./structscriptLanguage";

interface ParseError {
  line: number;
  column: number;
  message: string;
}

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  currentLine?: number;
  parseErrors?: ParseError[];
}

let languageRegistered = false;

export default function CodeEditor({ code, onChange, currentLine, parseErrors }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const { isDark } = useSandboxStore();
  const [themeTransition, setThemeTransition] = useState(false);
  // Monaco 加载状态：onMount 触发前为 loading；超时未触发则视为加载失败
  const [editorFailed, setEditorFailed] = useState(false);
  const [mountKey, setMountKey] = useState(0);

  useEffect(() => {
    // 挂载后 20 秒仍未 onMount 则判定加载失败；
    // 与上方的主题过渡 effect 一样属于挂载时的一次性初始化。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditorFailed(false);
    const timer = setTimeout(() => {
      if (!editorRef.current) setEditorFailed(true);
    }, 20000);
    return () => clearTimeout(timer);
  }, [mountKey]);

  // 主题切换时短暂淡入淡出（响应 isDark 外部状态变化触发过渡动画）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeTransition(true);
    const timer = setTimeout(() => setThemeTransition(false), 200);
    return () => clearTimeout(timer);
  }, [isDark]);

  const handleMount: OnMount = useCallback((ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    setEditorFailed(false);
    if (!languageRegistered) {
      registerStructScriptLanguage(monaco);
      languageRegistered = true;
    }
  }, []);

  // 同步解析错误到 Monaco markers
  useEffect(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) return;

    if (parseErrors && parseErrors.length > 0) {
      monaco.editor.setModelMarkers(ed.getModel()!, "structscript", parseErrors.map((e) => ({
        severity: monaco.MarkerSeverity.Error,
        message: e.message,
        startLineNumber: e.line,
        startColumn: e.column,
        endLineNumber: e.line,
        endColumn: e.column + 10,
      })));
    } else {
      monaco.editor.setModelMarkers(ed.getModel()!, "structscript", []);
    }
  }, [parseErrors]);

  // 当 currentLine 变化时高亮对应行
  const handleEditorDidUpdate = useCallback(() => {
    if (!editorRef.current) return;

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    if (currentLine !== undefined && currentLine >= 0) {
      decorationsRef.current = editorRef.current.createDecorationsCollection([
        {
          range: {
            startLineNumber: currentLine,
            startColumn: 1,
            endLineNumber: currentLine,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: "current-line-highlight",
            glyphMarginClassName: "current-line-glyph",
            glyphMarginHoverMessage: {
              value: "当前执行行",
            },
            overviewRuler: {
              color: "#4f46e5",
              position: 1,
            },
          },
        },
      ]);
    }
  }, [currentLine]);

  // currentLine 变化时跟随高亮（此前只在用户输入时触发，播放时高亮不跟随）
  useEffect(() => {
    handleEditorDidUpdate();
  }, [handleEditorDidUpdate]);

  // 在 value 变更后更新装饰
  const handleChange = useCallback(
    (value: string | undefined) => {
      onChange(value || "");
      // 延迟更新装饰，确保编辑器内容已同步
      requestAnimationFrame(() => {
        handleEditorDidUpdate();
      });
    },
    [onChange, handleEditorDidUpdate],
  );

  if (editorFailed) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="text-4xl">📝</div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          代码编辑器加载失败，可能是网络问题导致 Monaco 资源无法下载。
        </p>
        <button
          onClick={() => {
            editorRef.current = null;
            monacoRef.current = null;
            setMountKey((k) => k + 1);
          }}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          重试加载
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-full w-full overflow-hidden transition-opacity duration-200"
      style={{ opacity: themeTransition ? 0.85 : 1 }}
    >
      <Editor
        key={mountKey}
        height="100%"
        defaultLanguage="structscript"
        theme={isDark ? "vs-dark" : "light"}
        value={code}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 8 },
          renderLineHighlight: "line",
          folding: false,
          lineDecorationsWidth: 8,
          lineNumbersMinChars: 3,
          glyphMargin: true,
          overviewRulerBorder: false,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
            加载编辑器...
          </div>
        }
      />
      <style>{`
        .current-line-highlight {
          background: linear-gradient(90deg, rgba(79, 70, 229, 0.18) 0%, rgba(124, 58, 237, 0.08) 100%) !important;
          border-left: 3px solid transparent !important;
          border-image: linear-gradient(180deg, #4f46e5, #7c3aed) 1 !important;
        }
        .current-line-glyph {
          background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
          border-radius: 50% !important;
          margin-left: 4px;
          width: 8px !important;
          height: 8px !important;
          box-shadow: 0 0 6px rgba(79, 70, 229, 0.4);
        }
      `}</style>
    </div>
  );
}
