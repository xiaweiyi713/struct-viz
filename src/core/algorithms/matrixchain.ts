import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class MatrixChainRuntime implements StructureRuntime {
  private dp: number[][] = [];
  private split: number[][] = [];
  private cells: VisualMatrixCell[] = [];
  private p: number[] = [];
  private n = 0;

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    if (method !== "solve")
      throw new Error(`MatrixChain 不支持方法 "${method}"`);
    this.doSolve(args.map(Number), recorder, line);
  }

  getSnapshot(): VisualStructure {
    const headers = ["", ...Array.from({ length: this.n }, (_, i) => `A${i + 1}`)];
    return {
      type: "matrix",
      rows: this.n + 1,
      cols: this.n + 1,
      cells: [...this.cells],
      rowHeaders: headers,
      colHeaders: headers,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      n: { type: "number", value: this.n, display: `${this.n}` },
      p: {
        type: "array",
        value: this.p,
        display: `[${this.p.join(", ")}]`,
      },
    };
  }

  private doSolve(
    dims: number[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    // dims = p0, p1, ..., pn => n 个矩阵，n+1 个维度
    if (dims.length < 2)
      throw new Error("至少需要 2 个维度（1 个矩阵）");
    this.p = dims;
    this.n = dims.length - 1; // 矩阵个数

    const n = this.n;

    // 初始化 DP 表和分割点表
    this.dp = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
    this.split = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
    this.cells = [];

    // 初始化全部格子（下半矩阵 i > j 留空）
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        if (i === 0 || j === 0) {
          // 第 0 行/列不使用
          this.cells.push({
            id: `c-${i}-${j}`,
            row: i,
            col: j,
            value: "",
            status: "default",
          });
        } else if (i > j) {
          // 下半三角不使用
          this.cells.push({
            id: `c-${i}-${j}`,
            row: i,
            col: j,
            value: "",
            status: "default",
          });
        } else if (i === j) {
          // 对角线 m[i][i] = 0
          this.dp[i][j] = 0;
          this.cells.push({
            id: `c-${i}-${j}`,
            row: i,
            col: j,
            value: 0,
            status: "default",
          });
        }
        // i < j 的格子暂不创建，等填表时再加
      }
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化",
      description: `${n} 个矩阵，维度序列 p = [${this.p.join(", ")}]。m[i][i] = 0，按链长递增填表`,
      codeLine: line,
      pseudoLine: 2,
      targets: [],
    });

    // 按链长 len = 2, 3, ..., n 填表
    for (let len = 2; len <= n; len++) {
      for (let i = 1; i <= n - len + 1; i++) {
        const j = i + len - 1;
        this.dp[i][j] = Infinity;

        // 枚举分割点 k
        for (let k = i; k < j; k++) {
          const cost =
            this.dp[i][k] +
            this.dp[k + 1][j] +
            this.p[i - 1] * this.p[k] * this.p[j];

          if (cost < this.dp[i][j]) {
            this.dp[i][j] = cost;
            this.split[i][j] = k;
          }
        }

        // 添加该格子
        const cell: VisualMatrixCell = {
          id: `c-${i}-${j}`,
          row: i,
          col: j,
          value: this.dp[i][j],
          status: "active",
        };
        this.cells.push(cell);

        const cellIdx = this.cells.length - 1;

        const bestK = this.split[i][j];
        recorder.record({
          type: "FILL_CELL",
          title: `m[${i}][${j}] = ${this.dp[i][j]}（最优分割点 k=${bestK}）`,
          description: `链长 ${len}：min over k=[${i},${j}) of { m[${i}][k] + m[k+1][${j}] + p[${i - 1}]*p[k]*p[${j}] } = ${this.dp[i][j]}，分割点 k=${bestK}`,
          codeLine: line,
          pseudoLine: 9,
          targets: [`c-${i}-${j}`],
        });

        this.cells[cellIdx].status = "computed";
      }
    }

    // 回溯构造最优括号化方案
    const parenPlan: string[] = [];
    this.backtrack(1, n, recorder, line, parenPlan);

    // 标记最优解
    const finalIdx = this.cells.findIndex((c) => c.row === 1 && c.col === n);
    if (finalIdx >= 0) this.cells[finalIdx].status = "backtrack";

    recorder.record({
      type: "MARK_FINAL",
      title: `最少乘法次数: ${this.dp[1][n]}`,
      description: `最优括号化方案: ${parenPlan.join("")}`,
      codeLine: line,
      pseudoLine: 13,
      targets: [`c-1-${n}`],
    });
  }

  private backtrack(
    i: number,
    j: number,
    recorder: TraceRecorder,
    line: number,
    plan: string[],
  ): void {
    if (i === j) {
      plan.push(`A${i}`);
      return;
    }

    const k = this.split[i][j];

    // 标记当前格子
    const cellIdx = this.cells.findIndex((c) => c.row === i && c.col === j);
    if (cellIdx >= 0) this.cells[cellIdx].status = "backtrack";

    recorder.record({
      type: "BACKTRACK",
      title: `回溯 m[${i}][${j}]，分割点 k=${k}`,
      description: `在 k=${k} 处分割为 (${this.buildExpr(i, k)}) x (${this.buildExpr(k + 1, j)})`,
      codeLine: line,
      pseudoLine: 13,
      targets: [`c-${i}-${j}`],
    });

    plan.push("(");
    this.backtrack(i, k, recorder, line, plan);
    plan.push(" x ");
    this.backtrack(k + 1, j, recorder, line, plan);
    plan.push(")");
  }

  /** 递归构建括号化表达式字符串（仅用于回溯描述） */
  private buildExpr(i: number, j: number): string {
    if (i === j) return `A${i}`;
    const k = this.split[i][j];
    return `(${this.buildExpr(i, k)} x ${this.buildExpr(k + 1, j)})`;
  }
}
