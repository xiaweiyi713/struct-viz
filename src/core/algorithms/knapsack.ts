import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class KnapsackRuntime implements StructureRuntime {
  private dp: number[][] = [];
  private cells: VisualMatrixCell[] = [];
  private n = 0;
  private W = 0;
  private weights: number[] = [];
  private values: number[] = [];

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "solve") throw new Error(`Knapsack 不支持方法 "${method}"`);
    this.doSolve(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "matrix",
      rows: this.n + 1,
      cols: this.W + 1,
      cells: [...this.cells],
      rowHeaders: ["0", ...this.weights.map((_, i) => `w${i + 1}=${this.weights[i]},v${i + 1}=${this.values[i]}`)],
      colHeaders: Array.from({ length: this.W + 1 }, (_, j) => `${j}`),
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      items: { type: "number", value: this.n, display: `${this.n}` },
      capacity: { type: "number", value: this.W, display: `${this.W}` },
    };
  }

  private doSolve(params: number[], recorder: TraceRecorder, line: number): void {
    // params: weight1, value1, weight2, value2, ..., capacity
    if (params.length < 3) throw new Error("参数格式: w1, v1, w2, v2, ..., W");

    this.W = params[params.length - 1];
    this.weights = [];
    this.values = [];

    for (let i = 0; i < params.length - 1; i += 2) {
      this.weights.push(params[i]);
      this.values.push(params[i + 1]);
    }

    this.n = this.weights.length;
    this.dp = Array.from({ length: this.n + 1 }, () => new Array(this.W + 1).fill(0));
    this.cells = [];

    // 初始化第 0 行
    for (let j = 0; j <= this.W; j++) {
      this.cells.push({ id: `c-0-${j}`, row: 0, col: j, value: 0, status: "default" });
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化",
      description: `${this.n} 个物品，背包容量 ${this.W}。物品: ${this.weights.map((w, i) => `(w=${w},v=${this.values[i]})`).join(" ")}`,
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    // DP 填表
    for (let i = 1; i <= this.n; i++) {
      const w = this.weights[i - 1];
      const v = this.values[i - 1];

      for (let j = 0; j <= this.W; j++) {
        // 先继承上一行
        this.dp[i][j] = this.dp[i - 1][j];

        if (j >= w) {
          const take = this.dp[i - 1][j - w] + v;
          const skip = this.dp[i - 1][j];
          this.dp[i][j] = Math.max(take, skip);
        }

        const cell: VisualMatrixCell = {
          id: `c-${i}-${j}`,
          row: i,
          col: j,
          value: this.dp[i][j],
          status: "active",
        };
        this.cells.push(cell);

        const cellIdx = this.cells.length - 1;

        if (j >= w) {
          const take = this.dp[i - 1][j - w] + v;
          const skip = this.dp[i - 1][j];

          recorder.record({
            type: "FILL_CELL",
            title: `dp[${i}][${j}] = max(${skip}, ${this.dp[i - 1][j - w]}+${v}) = ${this.dp[i][j]}`,
            description: j >= w
              ? `比较: 不放物品${i}=${skip}, 放物品${i}=${take} → ${this.dp[i][j]}`
              : `容量不足，继承上一行: ${this.dp[i][j]}`,
            codeLine: line,
            pseudoLine: 7,
            targets: [`c-${i}-${j}`],
          });
        } else {
          recorder.record({
            type: "FILL_CELL",
            title: `dp[${i}][${j}] = ${this.dp[i][j]}（容量 ${j} < 重量 ${w}，无法放入）`,
            description: `继承 dp[${i - 1}][${j}] = ${this.dp[i][j]}`,
            codeLine: line,
            pseudoLine: 5,
            targets: [`c-${i}-${j}`],
          });
        }

        this.cells[cellIdx].status = "computed";
      }
    }

    // 回溯找选中物品
    let j = this.W;
    const selected: number[] = [];

    for (let i = this.n; i >= 1; i--) {
      const cellIdx = this.cells.findIndex((c) => c.row === i && c.col === j);
      if (cellIdx >= 0) this.cells[cellIdx].status = "backtrack";

      if (this.dp[i][j] !== this.dp[i - 1][j]) {
        selected.push(i);
        j -= this.weights[i - 1];

        recorder.record({
          type: "BACKTRACK",
          title: `选择物品 ${i}（w=${this.weights[i - 1]}, v=${this.values[i - 1]}）`,
          description: `dp[${i}][${j + this.weights[i - 1]}] ≠ dp[${i - 1}][${j + this.weights[i - 1]}]，说明选了物品 ${i}`,
          codeLine: line,
          pseudoLine: 11,
          targets: [`c-${i}-${j + this.weights[i - 1]}`],
        });
      }
    }

    const totalValue = this.dp[this.n][this.W];
    recorder.record({
      type: "MARK_FINAL",
      title: `最优解: 价值 ${totalValue}`,
      description: `选中物品: ${selected.reverse().map((i) => `${i}(w=${this.weights[i - 1]},v=${this.values[i - 1]})`).join(", ")}。总价值: ${totalValue}`,
      codeLine: line,
      pseudoLine: 11,
      targets: [],
    });
  }
}
