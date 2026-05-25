import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface PriorityProcess {
  id: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  startTime: number;
  endTime: number;
  waitingTime: number;
  turnaroundTime: number;
  completed: boolean;
}

export class PrioritySchedulerRuntime implements StructureRuntime {
  private processes: PriorityProcess[] = [];
  private ganttItems: VisualArrayItem[] = [];
  private waitingItems: VisualArrayItem[] = [];
  private turnaroundItems: VisualArrayItem[] = [];
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `prs-${this.idCounter}`;
  }

  private parseProcesses(args: Literal[]): PriorityProcess[] {
    const result: PriorityProcess[] = [];
    for (let i = 0; i < args.length; i += 3) {
      const id = result.length;
      result.push({
        id,
        name: `P${id}`,
        arrivalTime: Number(args[i]),
        burstTime: Number(args[i + 1]),
        priority: Number(args[i + 2]),
        startTime: -1,
        endTime: -1,
        waitingTime: 0,
        turnaroundTime: 0,
        completed: false,
      });
    }
    return result;
  }

  private buildSnapshot(): VisualStructure {
    const processColors = ["active", "highlighted", "default", "removed"];
    const gantt = this.ganttItems.length > 0
      ? this.ganttItems.map((item, idx) => ({
          ...item,
          status: processColors[idx % processColors.length] as VisualArrayItem["status"],
        }))
      : [];

    return {
      type: "multiarray",
      arrays: [gantt, this.waitingItems, this.turnaroundItems],
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
      case "schedule":
        this.doSchedule(args, recorder, line);
        break;
      default:
        throw new Error(`PriorityScheduler 不支持方法 "${method}"`);
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
      vars[`${p.name}_优先级`] = {
        type: "number",
        value: p.priority,
        display: `${p.priority}`,
      };
    }
    return vars;
  }

  private doSchedule(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.processes = this.parseProcesses(args);
    this.ganttItems = [];
    this.waitingItems = [];
    this.turnaroundItems = [];

    const n = this.processes.length;
    const completed: boolean[] = new Array(n).fill(false);
    let currentTime = 0;
    let completedCount = 0;

    while (completedCount < n) {
      // Find the highest priority (lowest number) process among arrived processes
      let bestIdx = -1;
      let bestPriority = Infinity;
      let bestArrival = Infinity;

      for (let i = 0; i < n; i++) {
        if (!completed[i] && this.processes[i].arrivalTime <= currentTime) {
          if (
            this.processes[i].priority < bestPriority ||
            (this.processes[i].priority === bestPriority &&
              this.processes[i].arrivalTime < bestArrival)
          ) {
            bestPriority = this.processes[i].priority;
            bestArrival = this.processes[i].arrivalTime;
            bestIdx = i;
          }
        }
      }

      if (bestIdx === -1) {
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

      const proc = this.processes[bestIdx];
      proc.startTime = currentTime;
      proc.endTime = currentTime + proc.burstTime;
      proc.turnaroundTime = proc.endTime - proc.arrivalTime;
      proc.waitingTime = proc.startTime - proc.arrivalTime;
      completed[bestIdx] = true;
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
        title: `优先级调度: 调度 ${proc.name}（优先级=${proc.priority}）`,
        description: `选择最高优先级进程 ${proc.name}（到达=${proc.arrivalTime}, 突发=${proc.burstTime}, 优先级=${proc.priority}），时间段 [${proc.startTime}, ${proc.endTime}]，等待=${proc.waitingTime}，周转=${proc.turnaroundTime}`,
        codeLine: line,
        targets: [proc.name],
      });
    }
  }
}
