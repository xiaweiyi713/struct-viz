import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── PipelineSuperscalarRuntime ──

const STAGES = ["IF", "ID", "EX", "MEM", "WB"];

export class PipelineSuperscalarRuntime implements StructureRuntime {
  private rows = 0;
  private cols = 0;
  private cells: VisualMatrixCell[] = [];
  private rowHeaders: string[] = [];
  private colHeaders: string[] = [];
  private lastOp = "";

  private makeCell(id: string, row: number, col: number, value: number | string, status: VisualMatrixCell["status"] = "default"): VisualMatrixCell {
    return { id, row, col, value, status };
  }

  private setCell(row: number, col: number, value: string, status: VisualMatrixCell["status"]): void {
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
      case "run":
        this.doRun(Number(args[0] ?? 8), Number(args[1] ?? 2), recorder, line);
        break;
      default:
        throw new Error(`PipelineSuperscalar 不支持方法 "${method}"`);
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

  // ── 超标量流水线 ──

  private doRun(instructionCount: number, issueWidth: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `超标量流水线 (${instructionCount}指令, 发射宽度${issueWidth})`;

    const stageCount = STAGES.length;

    // 计算每个指令的发射周期
    // 超标量：每个周期可发射 issueWidth 条指令
    const issueCycle: number[] = [];
    for (let i = 0; i < instructionCount; i++) {
      issueCycle.push(Math.floor(i / issueWidth));
    }

    // 总周期数 = 最后一条指令的发射周期 + 流水线级数
    const totalCycles = issueCycle[instructionCount - 1] + stageCount;

    this.rows = instructionCount;
    this.cols = totalCycles;
    this.rowHeaders = Array.from({ length: instructionCount }, (_, i) => `I${i + 1}`);
    this.colHeaders = Array.from({ length: totalCycles }, (_, i) => `C${i + 1}`);
    this.cells = [];

    // 初始化空矩阵
    for (let i = 0; i < instructionCount; i++) {
      for (let c = 0; c < totalCycles; c++) {
        this.cells.push(this.makeCell(`r${i}-c${c}`, i, c, "-", "default"));
      }
    }

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "初始化超标量流水线",
      description: `${instructionCount} 条指令，${stageCount} 个阶段（${STAGES.join("/")}），每周期最多发射 ${issueWidth} 条指令。预估总周期: ${totalCycles}`,
      codeLine: line,
    });

    // 逐周期填充
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const issuedThisCycle: string[] = [];

      for (let inst = 0; inst < instructionCount; inst++) {
        const startCycle = issueCycle[inst];
        const stageIdx = cycle - startCycle;

        if (stageIdx >= 0 && stageIdx < stageCount) {
          this.setCell(inst, cycle, STAGES[stageIdx], "computed");
          if (stageIdx === 0) {
            issuedThisCycle.push(`I${inst + 1}`);
          }
        }
      }

      // 计算本周期活跃的阶段
      const activeStages: string[] = [];
      for (let inst = 0; inst < instructionCount; inst++) {
        const startCycle = issueCycle[inst];
        const stageIdx = cycle - startCycle;
        if (stageIdx >= 0 && stageIdx < stageCount) {
          activeStages.push(`I${inst + 1}:${STAGES[stageIdx]}`);
        }
      }

      recorder.record({
        type: "FILL_CELL",
        title: `周期 ${cycle + 1}${issuedThisCycle.length > 0 ? `（发射: ${issuedThisCycle.join(", ")}）` : ""}`,
        description: `活跃阶段: ${activeStages.join(", ") || "无"}`,
        codeLine: line,
      });
    }

    // 单发射对比
    const scalarCycles = stageCount + instructionCount - 1;
    const speedup = scalarCycles / totalCycles;

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "超标量流水线执行完成",
      description: `总周期: ${totalCycles}。单发射需 ${scalarCycles} 周期，加速比: ${speedup.toFixed(2)}x。吞吐率: ${instructionCount}/${totalCycles} = ${(instructionCount / totalCycles).toFixed(2)} 条/周期`,
      codeLine: line,
    });
  }
}
