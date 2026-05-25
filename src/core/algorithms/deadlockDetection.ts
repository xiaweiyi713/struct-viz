import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class DeadlockDetectionRuntime implements StructureRuntime {
  private processCount = 0;
  private resourceCount = 0;
  private allocation: number[][] = [];
  private request: number[][] = [];
  private available: number[] = [];
  private deadlockedProcesses: Set<number> = new Set();
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `dd-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    const rows = this.processCount;
    const cols = this.resourceCount * 2; // Allocation + Request
    const cells: VisualMatrixCell[] = [];

    for (let i = 0; i < rows; i++) {
      // Allocation columns
      for (let j = 0; j < this.resourceCount; j++) {
        cells.push({
          id: this.nextId(),
          row: i,
          col: j,
          value: this.allocation[i]?.[j] ?? 0,
          status: this.deadlockedProcesses.has(i) ? ("removed" as const) : ("default" as const),
        });
      }
      // Request columns
      for (let j = 0; j < this.resourceCount; j++) {
        cells.push({
          id: this.nextId(),
          row: i,
          col: this.resourceCount + j,
          value: this.request[i]?.[j] ?? 0,
          status: this.deadlockedProcesses.has(i) ? ("removed" as const) : ("default" as const),
        });
      }
    }

    const rowHeaders = [];
    for (let i = 0; i < this.processCount; i++) {
      rowHeaders.push(
        this.deadlockedProcesses.has(i) ? `P${i}(死锁)` : `P${i}`,
      );
    }

    const colHeaders: string[] = [];
    for (const label of ["Alloc", "Request"]) {
      for (let j = 0; j < this.resourceCount; j++) {
        colHeaders.push(`${label}(R${j})`);
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
      case "allocate":
        this.doAllocate(args, recorder, line);
        break;
      case "request":
        this.doRequest(args, recorder, line);
        break;
      case "detect":
        this.doDetect(recorder, line);
        break;
      default:
        throw new Error(`DeadlockDetection 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      进程数: {
        type: "number",
        value: this.processCount,
        display: `${this.processCount}`,
      },
      资源数: {
        type: "number",
        value: this.resourceCount,
        display: `${this.resourceCount}`,
      },
      可用资源: {
        type: "string",
        value: `[${this.available.join(", ")}]`,
        display: `[${this.available.join(", ")}]`,
      },
      死锁进程: {
        type: "string",
        value:
          this.deadlockedProcesses.size > 0
            ? Array.from(this.deadlockedProcesses)
                .map((i) => `P${i}`)
                .join(", ")
            : "无",
        display:
          this.deadlockedProcesses.size > 0
            ? Array.from(this.deadlockedProcesses)
                .map((i) => `P${i}`)
                .join(", ")
            : "无",
      },
    };
  }

  private doInit(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.processCount = Number(args[0]);
    this.resourceCount = Number(args[1]);
    this.allocation = Array.from({ length: this.processCount }, () =>
      new Array(this.resourceCount).fill(0),
    );
    this.request = Array.from({ length: this.processCount }, () =>
      new Array(this.resourceCount).fill(0),
    );
    // Initially all resources are available (total = sum of none allocated yet)
    // We track available as what's left after allocations
    this.available = new Array(this.resourceCount).fill(0);
    this.deadlockedProcesses = new Set();

    recorder.record({
      type: "INIT_DISTANCE",
      title: "死锁检测: 初始化",
      description: `初始化 ${this.processCount} 个进程，${this.resourceCount} 种资源`,
      codeLine: line,
      targets: [],
    });
  }

  private doAllocate(args: Literal[], recorder: TraceRecorder, line: number): void {
    const procIdx = Number(args[0]);
    const resIdx = Number(args[1]);
    const amount = Number(args[2]);

    if (procIdx >= this.processCount || resIdx >= this.resourceCount) {
      throw new Error(
        `进程 ${procIdx} 或资源 ${resIdx} 越界（共 ${this.processCount} 进程，${this.resourceCount} 资源）`,
      );
    }

    this.allocation[procIdx][resIdx] += amount;

    recorder.record({
      type: "FILL_CELL",
      title: `死锁检测: P${procIdx} 分配 R${resIdx}×${amount}`,
      description: `进程 P${procIdx} 已分配资源 R${resIdx} 数量 ${amount}。分配矩阵 P${procIdx}: [${this.allocation[procIdx].join(", ")}]`,
      codeLine: line,
      targets: [`P${procIdx}`],
    });
  }

  private doRequest(args: Literal[], recorder: TraceRecorder, line: number): void {
    const procIdx = Number(args[0]);
    const resIdx = Number(args[1]);
    const amount = Number(args[2]);

    if (procIdx >= this.processCount || resIdx >= this.resourceCount) {
      throw new Error(
        `进程 ${procIdx} 或资源 ${resIdx} 越界（共 ${this.processCount} 进程，${this.resourceCount} 资源）`,
      );
    }

    this.request[procIdx][resIdx] += amount;

    recorder.record({
      type: "FILL_CELL",
      title: `死锁检测: P${procIdx} 请求 R${resIdx}×${amount}`,
      description: `进程 P${procIdx} 请求资源 R${resIdx} 数量 ${amount}。请求矩阵 P${procIdx}: [${this.request[procIdx].join(", ")}]`,
      codeLine: line,
      targets: [`P${procIdx}`],
    });
  }

  private doDetect(recorder: TraceRecorder, line: number): void {
    // Compute available resources
    // We assume total resources are the sum of all allocations (simplified model)
    // In this model, available = total - sum(allocation) for each resource
    // Since we don't have total, we compute available as remaining after allocations
    // For simplicity, assume each resource starts with sum of max allocation + some available
    // Actually, we'll compute: available = what remains if all non-deadlocked processes finish

    // First, compute total resources per type from allocation + available assumption
    // We'll use a different approach: start with available = 0 initially,
    // then try to see if any process can finish with Request <= Available
    // If a process has no outstanding request (all zeros), it can finish and release its allocation

    // Start with available = 0, then find processes that have no pending requests
    const work = new Array(this.resourceCount).fill(0);
    const finish = new Array(this.processCount).fill(false);
    this.deadlockedProcesses = new Set();

    // A process can finish if its request <= work
    // Initially work = 0, so only processes with all-zero requests can finish
    // First, mark processes with zero requests as finishable
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < this.processCount; i++) {
        if (finish[i]) continue;

        // Check if this process can finish: Request[i] <= Work
        const canFinish = this.request[i].every((r, j) => r <= work[j]);
        if (canFinish) {
          // Process finishes, release its allocation
          for (let j = 0; j < this.resourceCount; j++) {
            work[j] += this.allocation[i][j];
          }
          finish[i] = true;
          changed = true;

          recorder.record({
            type: "RELAX_EDGE",
            title: `死锁检测: P${i} 可完成`,
            description: `进程 P${i} 的请求 [${this.request[i].join(", ")}] <= 可用 [${work.map((w, j) => w - this.allocation[i][j]).join(", ")}]，标记为可完成，释放资源 [${this.allocation[i].join(", ")}]`,
            codeLine: line,
            targets: [`P${i}`],
          });
        }
      }
    }

    // Processes that couldn't finish are deadlocked
    for (let i = 0; i < this.processCount; i++) {
      if (!finish[i]) {
        this.deadlockedProcesses.add(i);
      }
    }

    if (this.deadlockedProcesses.size > 0) {
      const deadlockedList = Array.from(this.deadlockedProcesses)
        .map((i) => `P${i}`)
        .join(", ");
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `死锁检测: 检测到死锁！`,
        description: `检测到死锁，涉及进程: ${deadlockedList}。这些进程的请求无法被满足，形成循环等待。`,
        codeLine: line,
        targets: Array.from(this.deadlockedProcesses).map((i) => `P${i}`),
      });
    } else {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: "死锁检测: 无死锁",
        description: "所有进程均可完成，系统不存在死锁。",
        codeLine: line,
        targets: [],
      });
    }
  }
}
