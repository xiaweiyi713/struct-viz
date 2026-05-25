import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface Activity {
  start: number;
  finish: number;
  originalIndex: number;
}

export class ActivitySelectionRuntime implements StructureRuntime {
  private activities: Activity[] = [];
  private selected: boolean[] = [];
  private statuses: string[] = [];
  private itemIds: string[] = [];

  private buildItems(): VisualArrayItem[] {
    return this.activities.map((a, i) => ({
      id: this.itemIds[i],
      value: `${a.start}:${a.finish}`,
      status: this.statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "select") throw new Error(`ActivitySelection 不支持方法 "${method}"`);
    this.doSelect(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "ActivitySelection" };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      total: { type: "number", value: this.activities.length, display: `${this.activities.length}` },
      selected: {
        type: "number",
        value: this.selected.filter(Boolean).length,
        display: `${this.selected.filter(Boolean).length}`,
      },
    };
  }

  private doSelect(values: number[], recorder: TraceRecorder, line: number): void {
    // values 成对出现: [start0, finish0, start1, finish1, ...]
    if (values.length % 2 !== 0) throw new Error("参数必须成对出现: start0, finish0, start1, finish1, ...");

    this.activities = [];
    for (let i = 0; i < values.length; i += 2) {
      this.activities.push({ start: values[i], finish: values[i + 1], originalIndex: i / 2 });
    }

    this.selected = new Array(this.activities.length).fill(false);
    this.statuses = new Array(this.activities.length).fill("default");
    this.itemIds = this.activities.map((_, i) => `act-${i}`);

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化活动集合",
      description: `共 ${this.activities.length} 个活动: ${this.activities.map((a) => `(${a.start},${a.finish})`).join(" ")}`,
      codeLine: line,
      targets: [],
    });

    // 按结束时间排序
    this.activities.sort((a, b) => a.finish - b.finish);

    recorder.record({
      type: "VISIT_NODE",
      title: "按结束时间排序",
      description: `排序后: ${this.activities.map((a) => `(${a.start},${a.finish})`).join(" ")}`,
      codeLine: line,
      targets: [],
    });

    // 贪心选择
    this.selected[0] = true;
    this.statuses[0] = "highlighted";
    let lastFinish = this.activities[0].finish;
    let count = 1;

    recorder.record({
      type: "MARK_FINAL",
      title: `选择活动 0: (${this.activities[0].start}, ${this.activities[0].finish})`,
      description: `总是选择第一个（最早结束的）活动`,
      codeLine: line,
      targets: [this.itemIds[0]],
    });

    for (let i = 1; i < this.activities.length; i++) {
      this.statuses[i] = "active";

      recorder.record({
        type: "COMPARE",
        title: `检查活动 ${i}: start=${this.activities[i].start}, finish=${this.activities[i].finish}`,
        description: `活动 ${i} 开始时间 ${this.activities[i].start} ${this.activities[i].start >= lastFinish ? "≥" : "<"} 上一个选择活动的结束时间 ${lastFinish}`,
        codeLine: line,
        targets: [this.itemIds[i]],
      });

      if (this.activities[i].start >= lastFinish) {
        this.selected[i] = true;
        this.statuses[i] = "highlighted";
        lastFinish = this.activities[i].finish;
        count++;

        recorder.record({
          type: "MARK_FINAL",
          title: `选择活动 ${i}: (${this.activities[i].start}, ${this.activities[i].finish})`,
          description: `活动 ${i} 兼容，加入选择集合。当前已选 ${count} 个活动`,
          codeLine: line,
          targets: [this.itemIds[i]],
        });
      } else {
        this.statuses[i] = "removed";

        recorder.record({
          type: "VISIT_NODE",
          title: `跳过活动 ${i}: (${this.activities[i].start}, ${this.activities[i].finish})`,
          description: `开始时间 ${this.activities[i].start} < 结束时间 ${lastFinish}，与已选活动冲突`,
          codeLine: line,
          targets: [this.itemIds[i]],
        });
      }
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "活动选择完成",
      description: `共选出 ${count} 个兼容活动。贪心策略：每次选最早结束且不冲突的活动。`,
      codeLine: line,
      targets: this.itemIds.filter((_, i) => this.selected[i]),
    });
  }
}
