import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── PipelineRuntime ──

const DEFAULT_STAGES = ["IF", "ID", "EX", "MEM", "WB"];

interface HazardSpec {
  /** 数据冒险：指令 i 的结果被指令 j 使用，导致 j 的 ID 需要 stall */
  from: number;
  to: number;
}

export class PipelineRuntime implements StructureRuntime {
  private rows = 0;
  private cols = 0;
  private cells: VisualMatrixCell[] = [];
  private rowHeaders: string[] = [];
  private colHeaders: string[] = [];
  private lastOp = "";

  private makeCell(id: string, row: number, col: number, value: number | string, status: VisualMatrixCell["status"] = "default"): VisualMatrixCell {
    return { id, row, col, value, status };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "basic":
        this.doBasic(Number(args[0] ?? 5), Number(args[1] ?? 5), recorder, line);
        break;
      case "hazard":
        this.doHazard(
          Number(args[0] ?? 5),
          Number(args[1] ?? 5),
          args.slice(2),
          recorder, line,
        );
        break;
      default:
        throw new Error(`Pipeline 不支持方法 "${method}"`);
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

  // ── 基本流水线（无冲突） ──

  private doBasic(instructionCount: number, stageCount: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `基本流水线 (${instructionCount}指令, ${stageCount}阶段)`;

    const stages = this.getStages(stageCount);
    const totalCycles = stageCount + instructionCount - 1;

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
      title: "初始化流水线",
      description: `${instructionCount} 条指令，${stageCount} 个阶段（${stages.join("/")}），共 ${totalCycles} 个周期`,
      codeLine: line,
    });

    // 逐周期填充
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      for (let inst = 0; inst < instructionCount; inst++) {
        const stageIdx = cycle - inst;
        if (stageIdx >= 0 && stageIdx < stageCount) {
          this.setCell(inst, cycle, stages[stageIdx], "computed");
        }
      }

      // 记录当前周期
      const activeInsts: string[] = [];
      for (let inst = 0; inst < instructionCount; inst++) {
        const stageIdx = cycle - inst;
        if (stageIdx >= 0 && stageIdx < stageCount) {
          activeInsts.push(`I${inst + 1}: ${stages[stageIdx]}`);
        }
      }

      recorder.record({
        type: "FILL_CELL",
        title: `周期 ${cycle + 1}`,
        description: `活跃阶段: ${activeInsts.join(", ")}`,
        codeLine: line,
      });
    }

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "流水线执行完成",
      description: `总周期数: ${totalCycles}。吞吐率: ${instructionCount}/${totalCycles} = ${(instructionCount / totalCycles).toFixed(2)} 条/周期。加速比: ${totalCycles}/${instructionCount * stageCount} = ${(instructionCount * stageCount / totalCycles).toFixed(2)}`,
      codeLine: line,
    });
  }

  // ── 带数据冒险的流水线 ──

  private doHazard(instructionCount: number, stageCount: number, hazardArgs: Literal[], recorder: TraceRecorder, line: number): void {
    // 解析冒险参数：格式 "i-j" 表示指令 i 到指令 j 的数据冒险
    const hazards: HazardSpec[] = [];
    for (const arg of hazardArgs) {
      const str = String(arg);
      const parts = str.split("-").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        hazards.push({ from: parts[0] - 1, to: parts[1] - 1 }); // 转为0索引
      }
    }

    this.lastOp = `冒险流水线 (${instructionCount}指令, ${stageCount}阶段, ${hazards.length}个冒险)`;

    const stages = this.getStages(stageCount);
    const stageNames = stages;

    const startCycles: number[] = new Array(instructionCount).fill(0);

    // 首先计算不带冒险的起始周期
    for (let i = 0; i < instructionCount; i++) {
      startCycles[i] = i;
    }

    // 对每个冒险，计算需要插入的 bubble
    // 简化：如果指令 j 依赖指令 i，j 需要在 i 的 MEM 结束后才能 ID（或 EX 前）
    // 通常需要 stall 2 个周期（i: EX → j: EX 前需要等待 i 的 WB）
    // 使用转发可以减少 stall

    // 重新计算：逐指令确定开始周期
    for (let i = 0; i < instructionCount; i++) {
      startCycles[i] = i; // 至少是 i
    }

    // 处理冒险：对每个 hazard (from → to)
    for (const h of hazards) {
      if (h.from >= 0 && h.to >= 0 && h.to > h.from) {
        // 不带转发：to 需要 from 的 WB 结束后才能 ID
        // from 的 WB 周期 = startCycles[from] + 4
        // to 的 ID 周期 = startCycles[to] + 1
        // 需要 startCycles[to] + 1 > startCycles[from] + 4
        // 即 startCycles[to] > startCycles[from] + 3
        // 最小: startCycles[to] = startCycles[from] + 4
        const requiredStart = startCycles[h.from] + stageCount - 1; // WB 结束后的下一个周期
        if (startCycles[h.to] < requiredStart) {
          const delay = requiredStart - startCycles[h.to];
          // 从 h.to 开始，所有后续指令也需要延迟
          for (let k = h.to; k < instructionCount; k++) {
            startCycles[k] += delay;
          }
        }
      }
    }

    const totalCycles = Math.max(...startCycles) + stageCount;

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
      title: "初始化冒险流水线",
      description: `${instructionCount} 条指令，${stageCount} 个阶段，${hazards.length} 个数据冒险: ${hazards.map(h => `I${h.from + 1}→I${h.to + 1}`).join(", ")}。需要插入 bubble（ stall 周期）`,
      codeLine: line,
    });

    // 填充流水线并标记 stall/bubble
    for (let i = 0; i < instructionCount; i++) {
      const start = startCycles[i];
      for (let s = 0; s < stageCount; s++) {
        const cycle = start + s;
        if (cycle < totalCycles) {
          this.setCell(i, cycle, stageNames[s], "computed");
        }
      }

      // 标记 stall 周期（start 之前如果有 gap，填充 bubble）
      for (let c = i; c < start; c++) {
        this.setCell(i, c, "stall", "backtrack");
      }
    }

    // 逐周期记录
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const activeInsts: string[] = [];
      for (let inst = 0; inst < instructionCount; inst++) {
        const cell = this.getCell(inst, cycle);
        if (cell && cell.value !== "-") {
          activeInsts.push(`I${inst + 1}: ${cell.value}`);
        }
      }

      recorder.record({
        type: "FILL_CELL",
        title: `周期 ${cycle + 1}`,
        description: `活跃阶段: ${activeInsts.join(", ") || "无"}`,
        codeLine: line,
      });
    }

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "流水线执行完成",
      description: `总周期数: ${totalCycles}（无冒险为 ${stageCount + instructionCount - 1}）${hazards.length > 0 ? `，冒险导致 ${totalCycles - (stageCount + instructionCount - 1)} 个额外周期` : ""}`,
      codeLine: line,
    });
  }

  // ── 工具方法 ──

  private getStages(stageCount: number): string[] {
    if (stageCount <= 5) {
      return DEFAULT_STAGES.slice(0, stageCount);
    }
    return Array.from({ length: stageCount }, (_, i) => `S${i + 1}`);
  }

  private setCell(row: number, col: number, value: string, status: VisualMatrixCell["status"]): void {
    this.cells = this.cells.map(c => {
      if (c.row === row && c.col === col) {
        return { ...c, value, status };
      }
      return c;
    });
  }

  private getCell(row: number, col: number): VisualMatrixCell | undefined {
    return this.cells.find(c => c.row === row && c.col === col);
  }
}
