import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class EditDistanceRuntime implements StructureRuntime {
  private dp: number[][] = [];
  private cells: VisualMatrixCell[] = [];
  private s1 = "";
  private s2 = "";

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    if (method !== "solve")
      throw new Error(`EditDistance 不支持方法 "${method}"`);
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

  private getCellIndex(row: number, col: number): number {
    return this.cells.findIndex((c) => c.row === row && c.col === col);
  }

  private doSolve(
    s1: string,
    s2: string,
    recorder: TraceRecorder,
    line: number,
  ): void {
    this.s1 = s1;
    this.s2 = s2;

    const m = s1.length;
    const n = s2.length;
    this.dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    this.cells = [];

    // 初始化第一列: dp[i][0] = i（s1 的前 i 个字符变为空串需要 i 次删除）
    for (let i = 0; i <= m; i++) {
      this.dp[i][0] = i;
      this.cells.push({
        id: `c-${i}-0`,
        row: i,
        col: 0,
        value: i,
        status: "default",
      });
    }

    // 初始化第一行: dp[0][j] = j（空串变为 s2 的前 j 个字符需要 j 次插入）
    for (let j = 1; j <= n; j++) {
      this.dp[0][j] = j;
      this.cells.push({
        id: `c-0-${j}`,
        row: 0,
        col: j,
        value: j,
        status: "default",
      });
    }

    recorder.record({
      type: "FILL_CELL",
      title: "初始化边界",
      description: `s1 = "${s1}"（长度 ${m}），s2 = "${s2}"（长度 ${n}）。dp[i][0] = i（删除），dp[0][j] = j（插入）`,
      codeLine: line,
      targets: [],
    });

    // DP 填表
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        let val: number;

        if (s1[i - 1] === s2[j - 1]) {
          // 字符相同，无需操作
          val = this.dp[i - 1][j - 1];
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
            title: `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${val}`,
            description: `s1[${i - 1}] = '${s1[i - 1]}' == s2[${j - 1}] = '${s2[j - 1]}'，字符相同，无需操作`,
            codeLine: line,
            targets: [`c-${i}-${j}`],
          });
        } else {
          // 字符不同，取三种操作的最小值
          const del = this.dp[i - 1][j] + 1; // 删除 s1[i-1]
          const ins = this.dp[i][j - 1] + 1; // 插入 s2[j-1]
          const rep = this.dp[i - 1][j - 1] + 1; // 替换
          val = Math.min(del, ins, rep);
          this.dp[i][j] = val;

          const cell: VisualMatrixCell = {
            id: `c-${i}-${j}`,
            row: i,
            col: j,
            value: val,
            status: "active",
          };
          this.cells.push(cell);

          const opLabel =
            val === rep ? "替换" : val === del ? "删除" : "插入";
          recorder.record({
            type: "FILL_CELL",
            title: `dp[${i}][${j}] = min(${del}, ${ins}, ${rep}) = ${val}`,
            description: `s1[${i - 1}] = '${s1[i - 1]}' ≠ s2[${j - 1}] = '${s2[j - 1]}'，取删除(${del})、插入(${ins})、替换(${rep})的最小值（${opLabel}）`,
            codeLine: line,
            targets: [`c-${i}-${j}`],
          });
        }

        // 标记为已计算
        const lastCell = this.cells[this.cells.length - 1];
        lastCell.status = "computed";
      }
    }

    // 回溯操作路径
    const ops: string[] = [];
    let i = m;
    let j = n;

    // 标记终点
    let idx = this.getCellIndex(i, j);
    if (idx >= 0) this.cells[idx].status = "backtrack";

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
        // 字符相同，对角线移动（无操作）
        recorder.record({
          type: "BACKTRACK",
          title: `'${s1[i - 1]}' 相同，无操作`,
          description: `dp[${i}][${j}] = ${this.dp[i][j]}，对角线回溯到 dp[${i - 1}][${j - 1}]`,
          codeLine: line,
          targets: [`c-${i}-${j}`],
        });
        i--;
        j--;
      } else if (
        i > 0 &&
        j > 0 &&
        this.dp[i][j] === this.dp[i - 1][j - 1] + 1
      ) {
        // 替换
        ops.unshift(`替换 '${s1[i - 1]}' → '${s2[j - 1]}'`);
        recorder.record({
          type: "BACKTRACK",
          title: `替换 '${s1[i - 1]}' → '${s2[j - 1]}'`,
          description: `dp[${i}][${j}] = ${this.dp[i][j]} = dp[${i - 1}][${j - 1}] + 1，对角线回溯（替换操作）`,
          codeLine: line,
          targets: [`c-${i}-${j}`],
        });
        i--;
        j--;
      } else if (i > 0 && this.dp[i][j] === this.dp[i - 1][j] + 1) {
        // 删除
        ops.unshift(`删除 '${s1[i - 1]}'`);
        recorder.record({
          type: "BACKTRACK",
          title: `删除 '${s1[i - 1]}'`,
          description: `dp[${i}][${j}] = ${this.dp[i][j]} = dp[${i - 1}][${j}] + 1，向上回溯（删除操作）`,
          codeLine: line,
          targets: [`c-${i}-${j}`],
        });
        i--;
      } else {
        // 插入
        ops.unshift(`插入 '${s2[j - 1]}'`);
        recorder.record({
          type: "BACKTRACK",
          title: `插入 '${s2[j - 1]}'`,
          description: `dp[${i}][${j}] = ${this.dp[i][j]} = dp[${i}][${j - 1}] + 1，向左回溯（插入操作）`,
          codeLine: line,
          targets: [`c-${i}-${j}`],
        });
        j--;
      }

      // 标记当前格为回溯路径
      idx = this.getCellIndex(i, j);
      if (idx >= 0) this.cells[idx].status = "backtrack";
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `编辑距离 = ${this.dp[m][n]}`,
      description: `将 "${s1}" 转换为 "${s2}" 最少需要 ${this.dp[m][n]} 次操作: ${ops.join(" → ")}`,
      codeLine: line,
      targets: [],
    });
  }
}
