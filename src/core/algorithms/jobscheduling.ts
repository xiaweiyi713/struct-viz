import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface Job {
  deadline: number;
  profit: number;
  originalIndex: number;
}

export class JobSchedulingRuntime implements StructureRuntime {
  private jobs: Job[] = [];
  private schedule: (number | null)[] = []; // schedule[slot] = job index (in sorted order), null = empty
  private jobStatuses: string[] = [];
  private slotStatuses: string[] = [];
  private jobIds: string[] = [];
  private slotIds: string[] = [];
  private maxSlots = 0;

  private buildJobItems(): VisualArrayItem[] {
    return this.jobs.map((j, i) => ({
      id: this.jobIds[i],
      value: `d=${j.deadline},p=${j.profit}`,
      status: this.jobStatuses[i] as VisualArrayItem["status"],
    }));
  }

  private buildSlots(): VisualArrayItem[] {
    return this.schedule.map((jobIdx, slot) => ({
      id: this.slotIds[slot],
      value: jobIdx !== null
        ? `#${this.jobs[jobIdx].originalIndex}(p=${this.jobs[jobIdx].profit})`
        : "空",
      status: this.slotStatuses[slot] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "solve") throw new Error(`JobScheduling 不支持方法 "${method}"`);
    this.doSolve(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: [this.buildJobItems(), this.buildSlots()],
      labels: ["作业 (按利润降序)", "时间槽 (1-based)"],
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    const totalProfit = this.schedule.reduce((sum, jobIdx) => {
      if (jobIdx !== null) return sum + this.jobs[jobIdx].profit;
      return sum;
    }, 0);
    const scheduledCount = this.schedule.filter((s) => s !== null).length;
    return {
      jobs: { type: "number", value: this.jobs.length, display: `${this.jobs.length}` },
      scheduled: { type: "number", value: scheduledCount, display: `${scheduledCount}` },
      totalProfit: { type: "number", value: totalProfit, display: `${totalProfit}` },
    };
  }

  private doSolve(params: number[], recorder: TraceRecorder, line: number): void {
    // params: deadline1, profit1, deadline2, profit2, ...
    if (params.length < 2 || params.length % 2 !== 0) {
      throw new Error("参数格式: deadline1, profit1, deadline2, profit2, ...");
    }

    this.jobs = [];
    for (let i = 0; i < params.length; i += 2) {
      this.jobs.push({
        deadline: params[i],
        profit: params[i + 1],
        originalIndex: i / 2,
      });
    }

    // 最大 deadline 决定时间槽数
    this.maxSlots = Math.max(...this.jobs.map((j) => j.deadline));
    this.schedule = new Array(this.maxSlots).fill(null);
    this.slotStatuses = new Array(this.maxSlots).fill("default");
    this.jobStatuses = new Array(this.jobs.length).fill("default");
    this.jobIds = this.jobs.map((_, i) => `job-${i}`);
    this.slotIds = Array.from({ length: this.maxSlots }, (_, i) => `slot-${i}`);

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化作业调度",
      description: `共 ${this.jobs.length} 个作业: ${this.jobs.map((j) => `#${j.originalIndex}(d=${j.deadline},p=${j.profit})`).join(" ")}。最大 deadline=${this.maxSlots}，共 ${this.maxSlots} 个时间槽`,
      codeLine: line,
      targets: [],
    });

    // 按利润降序排序
    this.jobs.sort((a, b) => b.profit - a.profit);

    recorder.record({
      type: "VISIT_NODE",
      title: "按利润降序排序",
      description: `排序后: ${this.jobs.map((j) => `#${j.originalIndex}(d=${j.deadline},p=${j.profit})`).join(" ")}`,
      codeLine: line,
      targets: [],
    });

    let totalProfit = 0;

    for (let i = 0; i < this.jobs.length; i++) {
      const job = this.jobs[i];
      this.jobStatuses[i] = "active";

      recorder.record({
        type: "COMPARE",
        title: `考虑作业 #${job.originalIndex}: deadline=${job.deadline}, profit=${job.profit}`,
        description: `寻找 deadline=${job.deadline} 之前最晚的空闲时间槽`,
        codeLine: line,
        targets: [this.jobIds[i]],
      });

      // 从 deadline 往前找空闲槽（deadline 是 1-based，slot 是 0-based）
      let assignedSlot = -1;
      for (let s = Math.min(job.deadline, this.maxSlots) - 1; s >= 0; s--) {
        if (this.schedule[s] === null) {
          assignedSlot = s;
          break;
        }
      }

      if (assignedSlot >= 0) {
        this.schedule[assignedSlot] = i;
        this.slotStatuses[assignedSlot] = "highlighted";
        this.jobStatuses[i] = "highlighted";
        totalProfit += job.profit;

        recorder.record({
          type: "MARK_FINAL",
          title: `分配作业 #${job.originalIndex} 到时间槽 ${assignedSlot + 1}`,
          description: `利润 ${job.profit}，当前总利润 ${totalProfit}`,
          codeLine: line,
          targets: [this.jobIds[i], this.slotIds[assignedSlot]],
        });
      } else {
        this.jobStatuses[i] = "removed";

        recorder.record({
          type: "VISIT_NODE",
          title: `丢弃作业 #${job.originalIndex}: 无可用时间槽`,
          description: `deadline=${job.deadline} 之前的所有时间槽已满`,
          codeLine: line,
          targets: [this.jobIds[i]],
        });
      }
    }

    const scheduledJobs = this.schedule
      .map((jobIdx, slot) => jobIdx !== null ? `槽${slot + 1}: #${this.jobs[jobIdx].originalIndex}(p=${this.jobs[jobIdx].profit})` : null)
      .filter(Boolean);

    recorder.record({
      type: "MARK_FINAL",
      title: `作业调度完成，最大利润 ${totalProfit}`,
      description: `调度方案: ${scheduledJobs.join(" → ")}。总利润 ${totalProfit}。贪心策略：按利润从大到小，每个作业安排到 deadline 前最晚的空闲槽。`,
      codeLine: line,
      targets: this.slotIds.filter((_, i) => this.schedule[i] !== null),
    });
  }
}
