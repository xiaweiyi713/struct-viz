import type { languages, editor, IRange } from "monaco-editor";

// StructScript 支持的类名
const classNames = [
  "Stack", "Queue", "BST", "AVLTree", "RBTree", "BTree", "BPlusTree",
  "Trie", "Graph", "Huffman", "HashTable", "SplayTree", "TwoThreeTree",
  "SkipList", "UnionFind", "BinarySearch", "KMP", "NaiveStr",
  "QuickSort", "HeapSort", "MergeSort", "BubbleSort", "InsertionSort",
  "SelectionSort", "ShellSort", "CountingSort", "RadixSort",
  "Knapsack", "LCS", "EditDistance", "MatrixChain", "LIS",
  "ActivitySelection", "FractionalKnapsack", "JobScheduling",
];

// 各类支持的方法名
const classMethods: Record<string, string[]> = {
  Stack: ["push", "pop", "peek"],
  Queue: ["enqueue", "dequeue", "front", "push", "pop", "peek"],
  BST: ["insert", "delete", "search"],
  AVLTree: ["insert", "delete", "search"],
  RBTree: ["insert", "delete", "search"],
  BTree: ["insert", "delete", "search"],
  BPlusTree: ["insert", "delete", "search"],
  Trie: ["insert", "delete", "search"],
  Graph: ["addEdge", "bfs", "dfs", "dijkstra", "prim", "kruskal", "topo", "floyd", "criticalPath", "bellmanFord", "bipartite", "euler"],
  Huffman: ["build"],
  HashTable: ["insert", "search", "delete"],
  SplayTree: ["insert", "delete", "search"],
  TwoThreeTree: ["insert", "delete", "search"],
  SkipList: ["insert", "delete", "search"],
  UnionFind: ["init", "union", "find"],
  BinarySearch: ["search"],
  KMP: ["match"],
  NaiveStr: ["match"],
  QuickSort: ["sort"],
  HeapSort: ["sort"],
  MergeSort: ["sort"],
  BubbleSort: ["sort"],
  InsertionSort: ["sort"],
  SelectionSort: ["sort"],
  ShellSort: ["sort"],
  CountingSort: ["sort"],
  RadixSort: ["sort"],
  Knapsack: ["solve"],
  LCS: ["solve"],
  EditDistance: ["solve"],
  MatrixChain: ["solve"],
  LIS: ["solve"],
  ActivitySelection: ["solve"],
  FractionalKnapsack: ["solve"],
  JobScheduling: ["solve"],
};

// 所有方法名（用于通用补全）
const allMethods = [...new Set(Object.values(classMethods).flat())];

export const structscriptLanguage: languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".structscript",

  keywords: classNames,

  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, {
        cases: {
          "@keywords": "keyword",
          "@default": "identifier",
        },
      }],
      [/-?\d+/, "number"],
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/'([^'\\]|\\.)*$/, "string.invalid"],
      [/"/, "string", "@string_double"],
      [/'/, "string", "@string_single"],
      [/\/\/.*$/, "comment"],
      [/[;.,()]/, "delimiter"],
    ],

    string_double: [
      [/[^\\"]+/, "string"],
      [/\\./, "string.escape"],
      [/"/, "string", "@pop"],
    ],

    string_single: [
      [/[^\\']+/, "string"],
      [/\\./, "string.escape"],
      [/'/, "string", "@pop"],
    ],
  },
};

export function registerStructScriptLanguage(
  monaco: typeof import("monaco-editor"),
): void {
  monaco.languages.register({ id: "structscript" });
  monaco.languages.setMonarchTokensProvider("structscript", structscriptLanguage);

  monaco.languages.registerCompletionItemProvider("structscript", {
    triggerCharacters: [".", " "],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      // 在 `.` 后提供方法补全
      const dotMatch = textBeforeCursor.match(/(\w+)\.\w*$/);
      if (dotMatch) {
        const varName = dotMatch[1];
        // 查找变量的类型（向上扫描声明语句）
        const classType = findVariableClass(model, position.lineNumber, varName);
        const methods = classType ? (classMethods[classType] ?? allMethods) : allMethods;

        return {
          suggestions: methods.map((m) => ({
            label: m,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: m,
            range,
          })),
        };
      }

      // 行首提供类名补全
      if (/^\s*\w*$/.test(textBeforeCursor)) {
        return {
          suggestions: classNames.map((cls) => ({
            label: cls,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: cls,
            range,
          })),
        };
      }

      return { suggestions: [] };
    },
  });
}

function findVariableClass(
  model: editor.ITextModel,
  currentLine: number,
  varName: string,
): string | null {
  for (let i = 1; i < currentLine; i++) {
    const line = model.getLineContent(i).trim();
    const match = line.match(/^(\w+)\s+\w+/);
    if (match && line.includes(varName) && classNames.includes(match[1])) {
      return match[1];
    }
  }
  return null;
}
