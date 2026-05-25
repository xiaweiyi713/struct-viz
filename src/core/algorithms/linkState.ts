import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── LinkStateRuntime ──

interface LSLink {
  from: number;
  to: number;
  cost: number;
}

export class LinkStateRuntime implements StructureRuntime {
  private rows = 0;
  private cols = 0;
  private cells: VisualMatrixCell[] = [];
  private rowHeaders: string[] = [];
  private colHeaders: string[] = [];
  private lastOp = "";
  private nodeCount = 0;
  private links: LSLink[] = [];

  private makeCell(id: string, row: number, col: number, value: number | string, status: VisualMatrixCell["status"] = "default"): VisualMatrixCell {
    return { id, row, col, value, status };
  }

  private setCell(row: number, col: number, value: number | string, status: VisualMatrixCell["status"]): void {
    this.cells = this.cells.map(c => {
      if (c.row === row && c.col === col) return { ...c, value, status };
      return c;
    });
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "init":
        this.doInit(Number(args[0]), recorder, line);
        break;
      case "link":
        this.doLink(Number(args[0]), Number(args[1]), Number(args[2]), recorder, line);
        break;
      case "dijkstra":
        this.doDijkstra(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`LinkState 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "matrix",
      rows: this.rows,
      cols: this.cols,
      cells: this.cells,
      rowHeaders: this.rowHeaders,
      colHeaders: this.colHeaders,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      operation: { type: "string", value: this.lastOp, display: this.lastOp || "无" },
    };
  }

  // ── 初始化 ──

  private doInit(nodeCount: number, recorder: TraceRecorder, line: number): void {
    this.nodeCount = nodeCount;
    this.links = [];
    this.rows = nodeCount;
    this.cols = nodeCount;
    this.rowHeaders = Array.from({ length: nodeCount }, (_, i) => `N${i}`);
    this.colHeaders = Array.from({ length: nodeCount }, (_, i) => `N${i}`);
    this.cells = [];

    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < nodeCount; j++) {
        const value = i === j ? 0 : "∞";
        this.cells.push(this.makeCell(`r${i}c${j}`, i, j, value, "default"));
      }
    }

    recorder.record({
      type: "CHECK_INVARIANT",
      title: `初始化 ${nodeCount} 个节点`,
      description: `链路状态路由初始化，${nodeCount} 个路由器节点`,
      codeLine: line,
    });
  }

  // ── 添加链路 ──

  private doLink(a: number, b: number, cost: number, recorder: TraceRecorder, line: number): void {
    if (a < 0 || a >= this.nodeCount || b < 0 || b >= this.nodeCount) {
      throw new Error("节点编号超出范围");
    }

    this.links.push({ from: a, to: b, cost });

    // 更新邻接矩阵
    this.setCell(a, b, cost, "active");
    this.setCell(b, a, cost, "active");

    recorder.record({
      type: "LINK_NODE",
      title: `添加链路 N${a} ↔ N${b}（代价 ${cost}）`,
      description: `链路状态更新: 节点 ${a} 和 ${b} 之间代价为 ${cost}`,
      codeLine: line,
      targets: [],
    });

    // 恢复状态
    this.setCell(a, b, cost, "default");
    this.setCell(b, a, cost, "default");
  }

  // ── Dijkstra 算法 ──

  private doDijkstra(source: number, recorder: TraceRecorder, line: number): void {
    if (source < 0 || source >= this.nodeCount) {
      throw new Error("源节点编号超出范围");
    }

    this.lastOp = `Dijkstra 源=N${source}`;
    const n = this.nodeCount;

    // 构建邻接矩阵
    const adj: number[][] = Array.from({ length: n }, () => new Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) adj[i][i] = 0;
    for (const link of this.links) {
      adj[link.from][link.to] = link.cost;
      adj[link.to][link.from] = link.cost;
    }

    // Dijkstra
    const dist = new Array(n).fill(Infinity);
    const prev = new Array(n).fill(-1);
    const visited = new Array(n).fill(false);
    dist[source] = 0;

    // 更新矩阵显示距离
    this.rows = n;
    this.cols = 4; // 节点, 距离, 前驱, 状态
    this.rowHeaders = Array.from({ length: n }, (_, i) => `N${i}`);
    this.colHeaders = ["节点", "距离", "前驱", "状态"];
    this.cells = [];

    for (let i = 0; i < n; i++) {
      this.cells.push(this.makeCell(`r${i}-0`, i, 0, `N${i}`, "default"));
      this.cells.push(this.makeCell(`r${i}-1`, i, 1, i === source ? 0 : "∞", i === source ? "highlighted" : "default"));
      this.cells.push(this.makeCell(`r${i}-2`, i, 2, "-", "default"));
      this.cells.push(this.makeCell(`r${i}-3`, i, 3, i === source ? "源" : "未访问", "default"));
    }

    recorder.record({
      type: "CHECK_INVARIANT",
      title: `Dijkstra 从 N${source} 开始`,
      description: `初始: dist = [${dist.map((d, i) => i === source ? 0 : "∞").join(", ")}]`,
      codeLine: line,
    });

    for (let iter = 0; iter < n; iter++) {
      // 选最小距离的未访问节点
      let u = -1;
      let minDist = Infinity;
      for (let i = 0; i < n; i++) {
        if (!visited[i] && dist[i] < minDist) {
          minDist = dist[i];
          u = i;
        }
      }

      if (u === -1) break;

      visited[u] = true;

      // 更新当前节点状态
      this.setCell(u, 1, dist[u], "active");
      this.setCell(u, 3, "访问中", "active");

      recorder.record({
        type: "SELECT_MIN",
        title: `选择 N${u}（距离 ${dist[u]}）`,
        description: `从未访问节点中选择距离最小的节点 N${u}，距离 = ${dist[u]}`,
        codeLine: line,
      });

      // 松弛邻居
      for (let v = 0; v < n; v++) {
        if (!visited[v] && adj[u][v] < Infinity) {
          const newDist = dist[u] + adj[u][v];

          if (newDist < dist[v]) {
            dist[v] = newDist;
            prev[v] = u;

            this.setCell(v, 1, newDist, "highlighted");
            this.setCell(v, 2, `N${u}`, "highlighted");
            this.setCell(v, 3, "已更新", "highlighted");

            recorder.record({
              type: "RELAX_EDGE",
              title: `松弛 N${u} → N${v}: dist[${v}] = ${newDist}`,
              description: `经过 N${u} 到 N${v} 的距离 ${newDist} < 当前距离 ${dist[v] === Infinity ? "∞" : dist[v]}，更新`,
              codeLine: line,
            });
          }
        }
      }

      // 标记为已完成
      this.setCell(u, 1, dist[u], "computed");
      this.setCell(u, 3, "已完成", "computed");
    }

    // 恢复所有状态为 computed
    for (let i = 0; i < n; i++) {
      this.setCell(i, 1, dist[i], "computed");
      this.setCell(i, 3, "完成", "computed");
    }

    const distStr = dist.map(d => d === Infinity ? "∞" : d).join(", ");
    recorder.record({
      type: "MARK_FINAL",
      title: "Dijkstra 完成",
      description: `从 N${source} 出发的最短路径: [${distStr}]。前驱: [${prev.map(p => p >= 0 ? `N${p}` : "-").join(", ")}]`,
      codeLine: line,
      payload: { source, distances: dist, predecessors: prev },
    });
  }
}
