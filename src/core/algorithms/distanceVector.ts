import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── DistanceVectorRuntime ──

export class DistanceVectorRuntime implements StructureRuntime {
  private nodeCount = 0;
  private adjacency: Map<string, number> = new Map(); // "a-b" -> cost
  private distanceMatrix: number[][] = [];
  private cells: VisualMatrixCell[] = [];
  private initialized = false;

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    const numArgs = args.map((a) => Number(a));
    switch (method) {
      case "init":
        this.doInit(numArgs[0]);
        break;
      case "link":
        this.doLink(numArgs[0], numArgs[1], numArgs[2]);
        break;
      case "run":
        this.doRun(recorder, line);
        break;
      default:
        throw new Error(`DistanceVector 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "matrix",
      rows: this.nodeCount,
      cols: this.nodeCount,
      cells: [...this.cells],
      rowHeaders: Array.from({ length: this.nodeCount }, (_, i) => `D${i}`),
      colHeaders: Array.from({ length: this.nodeCount }, (_, i) => `N${i}`),
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      nodeCount: { type: "number", value: this.nodeCount, display: `${this.nodeCount}` },
      converged: {
        type: "string",
        value: this.initialized ? "是" : "否",
        display: this.initialized ? "已收敛" : "未运行",
      },
    };
  }

  private doInit(nodeCount: number): void {
    this.nodeCount = nodeCount;
    this.adjacency = new Map();
    this.initialized = false;

    // 初始化距离矩阵: 自己到自己为0, 其他为无穷大
    this.distanceMatrix = Array.from({ length: nodeCount }, (_, i) =>
      Array.from({ length: nodeCount }, (_, j) => (i === j ? 0 : Infinity))
    );

    this.rebuildCells();
  }

  private doLink(a: number, b: number, cost: number): void {
    if (a >= this.nodeCount || b >= this.nodeCount) {
      throw new Error(`节点编号超出范围 (0-${this.nodeCount - 1})`);
    }
    const key1 = `${a}-${b}`;
    const key2 = `${b}-${a}`;
    this.adjacency.set(key1, cost);
    this.adjacency.set(key2, cost);

    // 更新初始距离矩阵
    this.distanceMatrix[a][b] = cost;
    this.distanceMatrix[b][a] = cost;

    this.rebuildCells();
  }

  private rebuildCells(): void {
    this.cells = [];
    for (let i = 0; i < this.nodeCount; i++) {
      for (let j = 0; j < this.nodeCount; j++) {
        const val = this.distanceMatrix[i][j];
        this.cells.push({
          id: `c-${i}-${j}`,
          row: i,
          col: j,
          value: val === Infinity ? "∞" : val,
          status: i === j ? "computed" : "default",
        });
      }
    }
  }

  private updateCellStatus(row: number, col: number, status: VisualMatrixCell["status"]): void {
    const cell = this.cells.find((c) => c.row === row && c.col === col);
    if (cell) {
      cell.status = status;
      cell.value = this.distanceMatrix[row][col] === Infinity ? "∞" : this.distanceMatrix[row][col];
    }
  }

  private doRun(recorder: TraceRecorder, line: number): void {
    if (this.nodeCount === 0) throw new Error("请先调用 init() 初始化节点数");

    recorder.record({
      type: "INIT_DISTANCE",
      title: "距离向量算法初始化",
      description: `${this.nodeCount} 个节点，初始距离矩阵已建立。直连邻居的距离已知，其余为 ∞`,
      codeLine: line,
      targets: [],
    });

    const n = this.nodeCount;
    let round = 0;
    let changed = true;

    while (changed) {
      changed = false;
      round++;

      // 重置所有非对角线单元格状态
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            this.updateCellStatus(i, j, "default");
          }
        }
      }

      recorder.record({
        type: "VISIT_NODE",
        title: `第 ${round} 轮更新开始`,
        description: `开始第 ${round} 轮距离向量交换，每个节点向邻居广播自己的距离向量`,
        codeLine: line,
        targets: [],
      });

      // 创建副本用于同步更新
      const newMatrix = this.distanceMatrix.map((row) => [...row]);

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;

          // 标记当前正在计算的单元格
          this.updateCellStatus(i, j, "active");

          // 遍历所有邻居 k，尝试通过 k 到达 j
          for (let k = 0; k < n; k++) {
            if (k === i) continue;
            const key = `${i}-${k}`;
            const costToK = this.adjacency.get(key);
            if (costToK === undefined) continue; // k 不是邻居

            const distViaK = costToK + this.distanceMatrix[k][j];
            if (distViaK < newMatrix[i][j]) {
              newMatrix[i][j] = distViaK;
              changed = true;

              this.distanceMatrix[i][j] = distViaK;
              this.updateCellStatus(i, j, "highlighted");

              recorder.record({
                type: "UPDATE_DISTANCE",
                title: `更新 D${i}→D${j}`,
                description: `经由 N${k}: cost(${i},${k})=${costToK} + dist(${k},${j})=${this.distanceMatrix[k][j] === Infinity ? "∞" : this.distanceMatrix[k][j]} = ${distViaK}，更新 D${i}→D${j} = ${distViaK}`,
                codeLine: line,
                targets: [`c-${i}-${j}`],
              });
            }
          }
        }
      }

      // 复制更新后的矩阵
      this.distanceMatrix = newMatrix;
      this.rebuildCells();

      if (!changed) {
        // 标记所有单元格为最终状态
        for (const cell of this.cells) {
          cell.status = "computed";
        }

        recorder.record({
          type: "MARK_FINAL",
          title: `算法收敛（第 ${round} 轮无更新）`,
          description: `距离向量算法在第 ${round} 轮收敛，所有节点的最短路径已确定`,
          codeLine: line,
          targets: [],
        });
      }
    }

    this.initialized = true;
  }
}
