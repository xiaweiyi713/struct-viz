import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface ProcessInfo {
  id: number;
  name: string;
  max: number[];
  allocation: number[];
  need: number[];
}

export class BankerRuntime implements StructureRuntime {
  private resourceCount = 0;
  private resourceNames: string[] = [];
  private available: number[] = [];
  private processes: ProcessInfo[] = [];
  private safeSequence: number[] = [];
  private idCounter = 0;
  private lastAction = "";

  private nextId(): string {
    this.idCounter += 1;
    return `banker-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    const rows = this.processes.length;
    // Columns: Allocation (m) + Max (m) + Need (m) + Available (m) = 4m
    const cols = this.resourceCount * 4;
    const cells: VisualMatrixCell[] = [];

    for (let i = 0; i < rows; i++) {
      const p = this.processes[i];
      let col = 0;

      // Allocation
      for (let j = 0; j < this.resourceCount; j++) {
        cells.push({
          id: this.nextId(),
          row: i,
          col: col++,
          value: p.allocation[j],
          status: "default",
        });
      }
      // Max
      for (let j = 0; j < this.resourceCount; j++) {
        cells.push({
          id: this.nextId(),
          row: i,
          col: col++,
          value: p.max[j],
          status: "default",
        });
      }
      // Need
      for (let j = 0; j < this.resourceCount; j++) {
        cells.push({
          id: this.nextId(),
          row: i,
          col: col++,
          value: p.need[j],
          status: "default",
        });
      }
      // Available (only for first row, others show "-")
      if (i === 0) {
        for (let j = 0; j < this.resourceCount; j++) {
          cells.push({
            id: this.nextId(),
            row: i,
            col: col++,
            value: this.available[j],
            status: "highlighted",
          });
        }
      } else {
        for (let j = 0; j < this.resourceCount; j++) {
          cells.push({
            id: this.nextId(),
            row: i,
            col: col++,
            value: "-",
            status: "default",
          });
        }
      }
    }

    const rowHeaders = this.processes.map((p) => p.name);

    // Build column headers
    const colHeaders: string[] = [];
    for (const label of ["Alloc", "Max", "Need", "Avail"]) {
      for (const rn of this.resourceNames) {
        colHeaders.push(`${label}(${rn})`);
      }
    }

    return {
      type: "matrix",
      rows,
      cols,
      cells,
      rowHeaders,
      colHeaders,
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "init":
        this.doInit(args, recorder, line);
        break;
      case "addProcess":
        this.doAddProcess(args, recorder, line);
        break;
      case "request":
        this.doRequest(args, recorder, line);
        break;
      default:
        throw new Error(`Banker 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    const vars: Record<string, RuntimeValue> = {
      可用资源: {
        type: "string",
        value: `[${this.available.join(", ")}]`,
        display: `[${this.available.join(", ")}]`,
      },
      安全序列: {
        type: "string",
        value: this.safeSequence.length > 0
          ? this.safeSequence.map((i) => this.processes[i].name).join(" -> ")
          : "未检测",
        display: this.safeSequence.length > 0
          ? this.safeSequence.map((i) => this.processes[i].name).join(" -> ")
          : "未检测",
      },
    };

    if (this.lastAction) {
      vars["最近操作"] = {
        type: "string",
        value: this.lastAction,
        display: this.lastAction,
      };
    }

    return vars;
  }

  private doInit(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.resourceCount = Number(args[0]);
    this.resourceNames = [];
    for (let i = 0; i < this.resourceCount; i++) {
      this.resourceNames.push(String.fromCharCode(65 + i)); // A, B, C, ...
    }
    this.available = args.slice(1, 1 + this.resourceCount).map(Number);
    this.processes = [];
    this.safeSequence = [];

    recorder.record({
      type: "INIT_DISTANCE",
      title: "银行家算法: 初始化",
      description: `初始化 ${this.resourceCount} 种资源，可用资源向量: [${this.available.join(", ")}]`,
      codeLine: line,
      targets: [],
    });
  }

  private doAddProcess(args: Literal[], recorder: TraceRecorder, line: number): void {
    const m = this.resourceCount;
    const max = args.slice(0, m).map(Number);
    const allocation = args.slice(m, m * 2).map(Number);
    const need = max.map((v, i) => v - allocation[i]);
    const id = this.processes.length;

    this.processes.push({
      id,
      name: `P${id}`,
      max,
      allocation,
      need,
    });
    this.lastAction = `添加进程 P${id}`;

    recorder.record({
      type: "CREATE_NODE",
      title: `银行家算法: 添加进程 P${id}`,
      description: `进程 P${id} — Max: [${max.join(", ")}], Allocation: [${allocation.join(", ")}], Need: [${need.join(", ")}]`,
      codeLine: line,
      targets: [`P${id}`],
    });
  }

  private isSafe(): { safe: boolean; sequence: number[] } {
    const work = [...this.available];
    const finish = new Array(this.processes.length).fill(false);
    const sequence: number[] = [];

    let found = true;
    while (found) {
      found = false;
      for (let i = 0; i < this.processes.length; i++) {
        if (finish[i]) continue;
        const p = this.processes[i];
        // Check if Need[i] <= Work
        const canAllocate = p.need.every((n, j) => n <= work[j]);
        if (canAllocate) {
          // Simulate: Allocation[i] + Work
          for (let j = 0; j < this.resourceCount; j++) {
            work[j] += p.allocation[j];
          }
          finish[i] = true;
          sequence.push(i);
          found = true;
        }
      }
    }

    return { safe: finish.every(Boolean), sequence };
  }

  private doRequest(args: Literal[], recorder: TraceRecorder, line: number): void {
    const processIdx = Number(args[0]);
    const request = args.slice(1).map(Number);
    const processName = `P${processIdx}`;

    if (processIdx >= this.processes.length) {
      throw new Error(`进程 P${processIdx} 不存在`);
    }

    const p = this.processes[processIdx];

    // Step 1: Check if Request <= Need
    const exceedsNeed = request.some((r, i) => r > p.need[i]);
    if (exceedsNeed) {
      this.lastAction = `P${processIdx} 请求超出最大需求`;
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `银行家算法: P${processIdx} 请求被拒绝`,
        description: `请求 [${request.join(", ")}] 超过 Need [${p.need.join(", ")}]，请求不合法`,
        codeLine: line,
        targets: [processName],
      });
      return;
    }

    // Step 2: Check if Request <= Available
    const exceedsAvailable = request.some((r, i) => r > this.available[i]);
    if (exceedsAvailable) {
      this.lastAction = `P${processIdx} 请求资源不足，需等待`;
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `银行家算法: P${processIdx} 等待`,
        description: `请求 [${request.join(", ")}] 超过可用资源 [${this.available.join(", ")}]，进程需等待`,
        codeLine: line,
        targets: [processName],
      });
      return;
    }

    // Step 3: Pretend to allocate and check safety
    // Save state
    const savedAvailable = [...this.available];
    const savedAllocation = [...p.allocation];
    const savedNeed = [...p.need];

    // Pretend allocation
    for (let i = 0; i < this.resourceCount; i++) {
      this.available[i] -= request[i];
      p.allocation[i] += request[i];
      p.need[i] -= request[i];
    }

    const { safe, sequence } = this.isSafe();

    if (safe) {
      this.safeSequence = sequence;
      this.lastAction = `P${processIdx} 请求 [${request.join(", ")}] 成功分配，安全序列: ${sequence.map((i) => this.processes[i].name).join(" -> ")}`;

      recorder.record({
        type: "RELAX_EDGE",
        title: `银行家算法: P${processIdx} 请求成功`,
        description: `分配资源 [${request.join(", ")}] 给 P${processIdx}，系统安全。安全序列: ${sequence.map((i) => this.processes[i].name).join(" -> ")}。剩余可用: [${this.available.join(", ")}]`,
        codeLine: line,
        targets: [processName],
      });
    } else {
      // Rollback
      this.available = savedAvailable;
      p.allocation = savedAllocation;
      p.need = savedNeed;
      this.lastAction = `P${processIdx} 请求 [${request.join(", ")}] 导致不安全状态，已回滚`;

      recorder.record({
        type: "CHECK_INVARIANT",
        title: `银行家算法: P${processIdx} 请求被拒绝（不安全）`,
        description: `分配资源 [${request.join(", ")}] 给 P${processIdx} 会导致不安全状态，已回滚。可用资源: [${this.available.join(", ")}]`,
        codeLine: line,
        targets: [processName],
      });
    }
  }
}
