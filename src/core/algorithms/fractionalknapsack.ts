import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface Item {
  weight: number;
  value: number;
  ratio: number;
  originalIndex: number;
}

export class FractionalKnapsackRuntime implements StructureRuntime {
  private items: Item[] = [];
  private taken: number[] = []; // 每个物品实际装入的重量
  private statuses: string[] = [];
  private itemIds: string[] = [];
  private capacity = 0;
  private totalValue = 0;

  private buildItems(): VisualArrayItem[] {
    return this.items.map((item, i) => ({
      id: this.itemIds[i],
      value: `w=${item.weight},v=${item.value},r=${item.ratio.toFixed(2)}`,
      status: this.statuses[i] as VisualArrayItem["status"],
    }));
  }

  private buildTaken(): VisualArrayItem[] {
    return this.items.map((item, i) => ({
      id: `taken-${i}`,
      value: this.taken[i] > 0
        ? `${this.taken[i]}/${item.weight} (v=${(this.taken[i] / item.weight * item.value).toFixed(1)})`
        : "-",
      status: this.taken[i] > 0
        ? this.taken[i] < item.weight
          ? "highlighted"
          : "active"
        : this.statuses[i] === "removed"
          ? "removed"
          : "default" as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "solve") throw new Error(`FractionalKnapsack 不支持方法 "${method}"`);
    this.doSolve(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: [this.buildItems(), this.buildTaken()],
      labels: ["物品 (按单位价值排序)", "装入量"],
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      capacity: { type: "number", value: this.capacity, display: `${this.capacity}` },
      remaining: {
        type: "number",
        value: this.capacity - this.taken.reduce((s, t) => s + t, 0),
        display: `${(this.capacity - this.taken.reduce((s, t) => s + t, 0)).toFixed(1)}`,
      },
      totalValue: {
        type: "number",
        value: this.totalValue,
        display: `${this.totalValue.toFixed(1)}`,
      },
    };
  }

  private doSolve(params: number[], recorder: TraceRecorder, line: number): void {
    // params: capacity, w1, v1, w2, v2, ...
    if (params.length < 3) throw new Error("参数格式: capacity, w1, v1, w2, v2, ...");
    if ((params.length - 1) % 2 !== 0) throw new Error("物品参数必须成对: w1, v1, w2, v2, ...");

    this.capacity = params[0];
    this.items = [];
    for (let i = 1; i < params.length; i += 2) {
      const w = params[i];
      const v = params[i + 1];
      this.items.push({
        weight: w,
        value: v,
        ratio: v / w,
        originalIndex: (i - 1) / 2,
      });
    }

    this.taken = new Array(this.items.length).fill(0);
    this.statuses = new Array(this.items.length).fill("default");
    this.itemIds = this.items.map((_, i) => `item-${i}`);
    this.totalValue = 0;

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化分数背包",
      description: `背包容量 ${this.capacity}，共 ${this.items.length} 个物品: ${this.items.map((it) => `(w=${it.weight},v=${it.value})`).join(" ")}`,
      codeLine: line,
      targets: [],
    });

    // 按单位价值降序排序
    this.items.sort((a, b) => b.ratio - a.ratio);

    recorder.record({
      type: "VISIT_NODE",
      title: "按单位价值降序排序",
      description: `排序后: ${this.items.map((it) => `#${it.originalIndex}(w=${it.weight},v=${it.value},r=${it.ratio.toFixed(2)})`).join(" ")}`,
      codeLine: line,
      targets: [],
    });

    let remaining = this.capacity;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      this.statuses[i] = "active";

      recorder.record({
        type: "COMPARE",
        title: `考虑物品 #${item.originalIndex}: w=${item.weight}, v=${item.value}, 单位价值=${item.ratio.toFixed(2)}`,
        description: `剩余容量 ${remaining.toFixed(1)}，物品重量 ${item.weight}`,
        codeLine: line,
        targets: [this.itemIds[i]],
      });

      if (remaining <= 0) {
        this.statuses[i] = "removed";
        recorder.record({
          type: "VISIT_NODE",
          title: `跳过物品 #${item.originalIndex}`,
          description: `背包已满，剩余容量为 0`,
          codeLine: line,
          targets: [this.itemIds[i]],
        });
        continue;
      }

      if (item.weight <= remaining) {
        // 整个物品装入
        this.taken[i] = item.weight;
        remaining -= item.weight;
        this.totalValue += item.value;
        this.statuses[i] = "highlighted";

        recorder.record({
          type: "MARK_FINAL",
          title: `完整装入物品 #${item.originalIndex}: w=${item.weight}, v=${item.value}`,
          description: `剩余容量 ${remaining.toFixed(1)}，当前总价值 ${this.totalValue.toFixed(1)}`,
          codeLine: line,
          targets: [this.itemIds[i]],
        });
      } else {
        // 部分装入
        const fraction = remaining / item.weight;
        const partialValue = remaining * item.ratio;
        this.taken[i] = remaining;
        this.totalValue += partialValue;
        remaining = 0;
        this.statuses[i] = "highlighted";

        recorder.record({
          type: "MARK_FINAL",
          title: `部分装入物品 #${item.originalIndex}: ${this.taken[i].toFixed(1)}/${item.weight} (${(fraction * 100).toFixed(1)}%)`,
          description: `装入价值 ${partialValue.toFixed(1)}，背包已满。当前总价值 ${this.totalValue.toFixed(1)}`,
          codeLine: line,
          targets: [this.itemIds[i]],
        });
      }
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `分数背包完成，最大价值 ${this.totalValue.toFixed(1)}`,
      description: `装入物品: ${this.items.map((it, i) => this.taken[i] > 0 ? `#${it.originalIndex}(${this.taken[i]}/${it.weight})` : null).filter(Boolean).join(", ")}。总价值 ${this.totalValue.toFixed(1)}`,
      codeLine: line,
      targets: this.itemIds.filter((_, i) => this.taken[i] > 0),
    });
  }
}
