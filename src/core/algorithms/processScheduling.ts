import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface Process {
  id: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  startTime: number;
  endTime: number;
  waitingTime: number;
  turnaroundTime: number;
  remainingTime: number;
  completed: boolean;
}

export class ProcessSchedulerRuntime implements StructureRuntime {
  private processes: Process[] = [];
  private ganttItems: VisualArrayItem[] = [];
  private waitingItems: VisualArrayItem[] = [];
  private turnaroundItems: VisualArrayItem[] = [];
  private currentProcessCount = 0;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `ps-${this.idCounter}`;
  }

  private parseProcesses(args: Literal[]): Process[] {
    const result: Process[] = [];
    for (let i = 0; i < args.length; i += 2) {
      result.push({
        id: this.currentProcessCount,
        name: `P${this.currentProcessCount}`,
        arrivalTime: Number(args[i]),
        burstTime: Number(args[i + 1]),
        startTime: -1,
        endTime: -1,
        waitingTime: 0,
        turnaroundTime: 0,
        remainingTime: Number(args[i + 1]),
        completed: false,
      });
      this.currentProcessCount++;
    }
    return result;
  }

  private buildSnapshot(): VisualStructure {
    const processColors = ["active", "highlighted", "default", "removed"];
    const gantt = this.ganttItems.length > 0
      ? this.ganttItems.map((item, idx) => ({
          ...item,
          status: (processColors[idx % processColors.length]) as VisualArrayItem["status"],
        }))
      : [];

    return {
      type: "multiarray",
      arrays: [
        gantt,
        this.waitingItems,
        this.turnaroundItems,
      ],
      labels: ["甘特图", "等待时间", "周转时间"],
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "fcfs":
        this.doFCFS(args, recorder, line);
        break;
      case "sjf":
        this.doSJF(args, recorder, line);
        break;
      case "rr":
        this.doRR(args, recorder, line);
        break;
      default:
        throw new Error(`ProcessScheduler 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    const vars: Record<string, RuntimeValue> = {};
    for (const p of this.processes) {
      vars[`${p.name}_等待`] = {
        type: "number",
        value: p.waitingTime,
        display: `${p.waitingTime}`,
      };
      vars[`${p.name}_周转`] = {
        type: "number",
        value: p.turnaroundTime,
        display: `${p.turnaroundTime}`,
      };
    }
    return vars;
  }

  private doFCFS(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.processes = this.parseProcesses(args);
    this.ganttItems = [];
    this.waitingItems = [];
    this.turnaroundItems = [];

    // Sort by arrival time
    const sorted = [...this.processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

    let currentTime = 0;
    for (const proc of sorted) {
      if (currentTime < proc.arrivalTime) {
        currentTime = proc.arrivalTime;
      }
      proc.startTime = currentTime;
      proc.endTime = currentTime + proc.burstTime;
      proc.turnaroundTime = proc.endTime - proc.arrivalTime;
      proc.waitingTime = proc.startTime - proc.arrivalTime;
      currentTime = proc.endTime;

      // Record gantt entry
      this.ganttItems.push({
        id: this.nextId(),
        value: `${proc.name}:[${proc.startTime}-${proc.endTime}]`,
        status: "active",
      });
      this.waitingItems.push({
        id: this.nextId(),
        value: `${proc.name}:${proc.waitingTime}`,
        status: "default",
      });
      this.turnaroundItems.push({
        id: this.nextId(),
        value: `${proc.name}:${proc.turnaroundTime}`,
        status: "default",
      });

      recorder.record({
        type: "ENQUEUE",
        title: `FCFS: 调度 ${proc.name}`,
        description: `调度进程 ${proc.name}（到达=${proc.arrivalTime}, 突发=${proc.burstTime}），时间段 [${proc.startTime}, ${proc.endTime}]，等待=${proc.waitingTime}，周转=${proc.turnaroundTime}`,
        codeLine: line,
        targets: [proc.name],
      });
    }
  }

  private doSJF(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.processes = this.parseProcesses(args);
    this.ganttItems = [];
    this.waitingItems = [];
    this.turnaroundItems = [];

    const n = this.processes.length;
    const completed: boolean[] = new Array(n).fill(false);
    let currentTime = 0;
    let completedCount = 0;

    while (completedCount < n) {
      // Find the shortest job among arrived processes
      let shortestIdx = -1;
      let shortestBurst = Infinity;
      for (let i = 0; i < n; i++) {
        if (!completed[i] && this.processes[i].arrivalTime <= currentTime) {
          if (this.processes[i].burstTime < shortestBurst) {
            shortestBurst = this.processes[i].burstTime;
            shortestIdx = i;
          }
        }
      }

      if (shortestIdx === -1) {
        // No process has arrived, advance time to next arrival
        let nextArrival = Infinity;
        for (let i = 0; i < n; i++) {
          if (!completed[i] && this.processes[i].arrivalTime < nextArrival) {
            nextArrival = this.processes[i].arrivalTime;
          }
        }
        currentTime = nextArrival;
        continue;
      }

      const proc = this.processes[shortestIdx];
      proc.startTime = currentTime;
      proc.endTime = currentTime + proc.burstTime;
      proc.turnaroundTime = proc.endTime - proc.arrivalTime;
      proc.waitingTime = proc.startTime - proc.arrivalTime;
      completed[shortestIdx] = true;
      completedCount++;
      currentTime = proc.endTime;

      this.ganttItems.push({
        id: this.nextId(),
        value: `${proc.name}:[${proc.startTime}-${proc.endTime}]`,
        status: "active",
      });
      this.waitingItems.push({
        id: this.nextId(),
        value: `${proc.name}:${proc.waitingTime}`,
        status: "default",
      });
      this.turnaroundItems.push({
        id: this.nextId(),
        value: `${proc.name}:${proc.turnaroundTime}`,
        status: "default",
      });

      recorder.record({
        type: "ENQUEUE",
        title: `SJF: 调度 ${proc.name}`,
        description: `调度最短进程 ${proc.name}（到达=${proc.arrivalTime}, 突发=${proc.burstTime}），时间段 [${proc.startTime}, ${proc.endTime}]，等待=${proc.waitingTime}，周转=${proc.turnaroundTime}`,
        codeLine: line,
        targets: [proc.name],
      });
    }
  }

  private doRR(args: Literal[], recorder: TraceRecorder, line: number): void {
    // Last arg is time quantum
    const timeQuantum = Number(args[args.length - 1]);
    const processArgs = args.slice(0, args.length - 1);
    this.processes = this.parseProcesses(processArgs);
    this.ganttItems = [];
    this.waitingItems = [];
    this.turnaroundItems = [];

    const n = this.processes.length;
    // Sort by arrival time initially
    const readyQueue: number[] = [];
    let currentTime = 0;
    const completed: boolean[] = new Array(n).fill(false);
    let completedCount = 0;
    const inQueue: boolean[] = new Array(n).fill(false);

    // Add initially arrived processes
    for (let i = 0; i < n; i++) {
      if (this.processes[i].arrivalTime <= currentTime && !inQueue[i]) {
        readyQueue.push(i);
        inQueue[i] = true;
      }
    }

    while (completedCount < n) {
      if (readyQueue.length === 0) {
        // Advance to next arrival
        let nextArrival = Infinity;
        for (let i = 0; i < n; i++) {
          if (!completed[i] && !inQueue[i] && this.processes[i].arrivalTime < nextArrival) {
            nextArrival = this.processes[i].arrivalTime;
          }
        }
        currentTime = nextArrival;
        for (let i = 0; i < n; i++) {
          if (this.processes[i].arrivalTime <= currentTime && !completed[i] && !inQueue[i]) {
            readyQueue.push(i);
            inQueue[i] = true;
          }
        }
        continue;
      }

      const idx = readyQueue.shift()!;
      const proc = this.processes[idx];
      const execTime = Math.min(timeQuantum, proc.remainingTime);
      const startTime = currentTime;
      const endTime = currentTime + execTime;

      proc.remainingTime -= execTime;
      currentTime = endTime;

      if (proc.remainingTime === 0) {
        proc.endTime = endTime;
        proc.turnaroundTime = endTime - proc.arrivalTime;
        proc.waitingTime = proc.turnaroundTime - proc.burstTime;
        completed[idx] = true;
        completedCount++;

        // Update summary items when completed
        this.updateSummaryItems();
      }

      // Add newly arrived processes to the queue
      for (let i = 0; i < n; i++) {
        if (
          !completed[i] &&
          !inQueue[i] &&
          this.processes[i].arrivalTime <= currentTime
        ) {
          readyQueue.push(i);
          inQueue[i] = true;
        }
      }

      // If not completed, add back to queue
      if (!completed[idx]) {
        readyQueue.push(idx);
      }

      this.ganttItems.push({
        id: this.nextId(),
        value: `${proc.name}:[${startTime}-${endTime}]`,
        status: "active",
      });

      recorder.record({
        type: "ENQUEUE",
        title: `RR: 调度 ${proc.name}（时间片=${timeQuantum}）`,
        description: `进程 ${proc.name} 执行时间片 [${startTime}, ${endTime}]，剩余=${proc.remainingTime}，${completed[idx] ? `已完成，等待=${proc.waitingTime}，周转=${proc.turnaroundTime}` : "未完成，加入就绪队列"}`,
        codeLine: line,
        targets: [proc.name],
      });
    }
  }

  private updateSummaryItems(): void {
    this.waitingItems = [];
    this.turnaroundItems = [];
    for (const proc of this.processes) {
      if (proc.endTime >= 0) {
        this.waitingItems.push({
          id: this.nextId(),
          value: `${proc.name}:${proc.waitingTime}`,
          status: "default",
        });
        this.turnaroundItems.push({
          id: this.nextId(),
          value: `${proc.name}:${proc.turnaroundTime}`,
          status: "default",
        });
      }
    }
  }
}
