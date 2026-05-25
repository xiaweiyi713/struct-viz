import { useRef, useCallback, useEffect } from "react";
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

  const handleMount: OnMount = useCallback((ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
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

  return (
    <div className="h-full w-full overflow-hidden">
      <Editor
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
