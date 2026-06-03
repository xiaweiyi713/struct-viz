export type TraceEventType =
  | "CREATE_NODE"
  | "DELETE_NODE"
  | "LINK_NODE"
  | "UNLINK_NODE"
  | "VISIT_NODE"
  | "COMPARE"
  | "ROTATE_LEFT"
  | "ROTATE_RIGHT"
  | "RECOLOR"
  | "RELAX_EDGE"
  | "UPDATE_DISTANCE"
  | "PUSH"
  | "POP"
  | "ENQUEUE"
  | "DEQUEUE"
  | "SWAP"
  | "MARK_FINAL"
  | "CHECK_INVARIANT"
  | "SPLIT_NODE"
  | "PROMOTE_KEY"
  | "INIT_DISTANCE"
  | "FILL_CELL"
  | "BACKTRACK"
  | "DISTRIBUTE"
  | "COLLECT"
  | "SELECT_MIN"
  | "UNION"
  | "FIND";

export interface TraceEvent {
  id: string;
  step: number;
  type: TraceEventType;
  title: string;
  description: string;
  codeLine?: number;
  /** 当前步骤对应的伪代码行（0-based 索引），用于伪代码面板精确高亮 */
  pseudoLine?: number;
  targets?: string[];
  payload?: Record<string, unknown>;
}

export interface InvariantCheck {
  name: string;
  passed: boolean;
  description: string;
}

export interface RuntimeValue {
  type: "number" | "string" | "boolean" | "node" | "null" | "array";
  value: unknown;
  display: string;
}

export interface TraceSnapshot {
  structures: Record<string, VisualStructure>;
  variables?: Record<string, RuntimeValue>;
  invariants?: InvariantCheck[];
}

export interface TraceFrame {
  step: number;
  event: TraceEvent;
  snapshot: TraceSnapshot;
}

// ── Visual Structure Types ──

export interface VisualTreeNode {
  id: string;
  key: number | string;
  color?: "red" | "black" | "default";
  left: string | null;
  right: string | null;
  parent: string | null;
  children?: string[];
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface VisualGraphNode {
  id: string;
  label: string;
  status: "unvisited" | "visiting" | "visited" | "final";
  distance: number | string;
}

export interface VisualGraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  status: "normal" | "relaxed" | "active" | "disabled";
}

export interface VisualArrayItem {
  id: string;
  value: number | string;
  status: "default" | "active" | "highlighted" | "removed";
}

export interface VisualStringChar {
  id: string;
  char: string;
  status: "default" | "active" | "matched" | "mismatched" | "highlighted";
  index: number;
}

export interface VisualHashEntry {
  id: string;
  key: number;
  status: "default" | "active" | "found" | "deleted" | "highlighted";
}

export interface VisualHashBucket {
  id: string;
  index: number;
  entries: VisualHashEntry[];
  status: "default" | "active" | "highlighted";
}

export interface VisualMatrixCell {
  id: string;
  row: number;
  col: number;
  value: number | string;
  status: "default" | "active" | "highlighted" | "computed" | "backtrack";
}

export type VisualStructure =
  | { type: "tree"; nodes: Record<string, VisualTreeNode>; rootId: string | null }
  | { type: "graph"; nodes: Record<string, VisualGraphNode>; edges: Record<string, VisualGraphEdge> }
  | { type: "array"; items: VisualArrayItem[]; label: string }
  | { type: "stack"; items: VisualArrayItem[] }
  | { type: "queue"; items: VisualArrayItem[] }
  | { type: "string"; textChars: VisualStringChar[]; patternChars: VisualStringChar[]; nextArray: number[]; textIndex: number; patternIndex: number }
  | { type: "hashtable"; buckets: VisualHashBucket[]; tableSize: number; hashFunc: string }
  | { type: "multiarray"; arrays: VisualArrayItem[][]; labels: string[] }
  | { type: "matrix"; rows: number; cols: number; cells: VisualMatrixCell[]; rowHeaders?: string[]; colHeaders?: string[] };
