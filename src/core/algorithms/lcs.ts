import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class LCSRuntime implements StructureRuntime {
  private dp: number[][] = [];
  private cells: VisualMatrixCell[] = [];
  private s1 = "";
  private s2 = "";

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "solve") throw new Error(`LCS 不支持方法 "${method}"`);
    this.doSolve(String(args[0]), String(args[1]), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "matrix",
      rows: this.s1.length + 1,
      cols: this.s2.length + 1,
      cells: [...this.cells],
      rowHeaders: ["ε", ...this.s1.split("")],
      colHeaders: ["ε", ...this.s2.split("")],
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      s1: { type: "string", value: this.s1, display: `"${this.s1}"` },
      s2: { type: "string", value: this.s2, display: `"${this.s2}"` },
    };
  }

  private doSolve(s1: string, s2: string, recorder: TraceRecorder, line: number): void {
    this.s1 = s1;
    this.s2 = s2;

    const m = s1.length;
    const n = s2.length;
    this.dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    this.cells = [];

    // 初始化边界
    for (let i = 0; i <= m; i++) {
      this.cells.push({ id: `c-${i}-0`, row: i, col: 0, value: 0, status: "default" });
    }
    for (let j = 1; j <= n; j++) {
      this.cells.push({ id: `c-0-${j}`, row: 0, col: j, value: 0, status: "default" });
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化",
      description: `s1 = "${s1}"（长度 ${m}），s2 = "${s2}"（长度 ${n}）。dp[0][j] = dp[i][0] = 0`,
      codeLine: line,
      pseudoLine: 2,
      targets: [],
    });

    // DP 填表
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        let val: number;

        if (s1[i - 1] === s2[j - 1]) {
          val = this.dp[i - 1][j - 1] + 1;
          this.dp[i][j] = val;

          const cell: VisualMatrixCell = {
            id: `c-${i}-${j}`,
            row: i,
            col: j,
            value: val,
            status: "active",
          };
          this.cells.push(cell);

          recorder.record({
            type: "FILL_CELL",
            title: `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${val}`,
            description: `s1[${i - 1}] = '${s1[i - 1]}' == s2[${j - 1}] = '${s2[j - 1]}'，字符匹配，LCS 长度 +1`,
            codeLine: line,
            pseudoLine: 6,
            targets: [`c-${i}-${j}`],
          });
        } else {
          val = Math.max(this.dp[i - 1][j], this.dp[i][j - 1]);
          this.dp[i][j] = val;

          const cell: VisualMatrixCell = {
            id: `c-${i}-${j}`,
            row: i,
            col: j,
            value: val,
            status: "active",
          };
          this.cells.push(cell);

          recorder.record({
            type: "FILL_CELL",
            title: `dp[${i}][${j}] = max(${this.dp[i - 1][j]}, ${this.dp[i][j - 1]}) = ${val}`,
            description: `s1[${i - 1}] = '${s1[i - 1]}' ≠ s2[${j - 1}] = '${s2[j - 1]}'，取上方和左方的较大值`,
            codeLine: line,
            pseudoLine: 8,
            targets: [`c-${i}-${j}`],
          });
        }

        // 标记为已计算
        const lastCell = this.cells[this.cells.length - 1];
        lastCell.status = "computed";
      }
    }

    // 回溯找 LCS
    const lcs: string[] = [];
    let i = m;
    let j = n;

    while (i > 0 && j > 0) {
      const cellIdx = this.cells.findIndex((c) => c.row === i && c.col === j);
      if (cellIdx >= 0) this.cells[cellIdx].status = "backtrack";

      if (s1[i - 1] === s2[j - 1]) {
        lcs.unshift(s1[i - 1]);

        recorder.record({
          type: "BACKTRACK",
          title: `'${s1[i - 1]}' 匹配，加入 LCS`,
          description: `dp[${i}][${j}] = ${this.dp[i][j]}，对角线回溯到 dp[${i - 1}][${j - 1}]`,
          codeLine: line,
          pseudoLine: 10,
          targets: [`c-${i}-${j}`],
        });

        i--;
        j--;
      } else if (this.dp[i - 1][j] > this.dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    // 标记回溯起点
    const startIdx = this.cells.findIndex((c) => c.row === i && c.col === j);
    if (startIdx >= 0) this.cells[startIdx].status = "backtrack";

    recorder.record({
      type: "MARK_FINAL",
      title: `LCS = "${lcs.join("")}"，长度 ${this.dp[m][n]}`,
      description: `最长公共子序列: "${lcs.join("")}"`,
      codeLine: line,
      pseudoLine: 9,
      targets: [],
    });
  }
}
