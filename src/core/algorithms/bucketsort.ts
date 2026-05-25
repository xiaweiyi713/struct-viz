import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class BucketSortRuntime implements StructureRuntime {
  private inputArr: number[] = [];
  private buckets: number[][] = [];
  private outputArr: number[] = [];
  private inputStatuses: string[] = [];
  private bucketStatuses: string[][] = [];
  private outputStatuses: string[] = [];

  private makeItems(arr: number[], statuses: string[], prefix: string): VisualArrayItem[] {
    return arr.map((v, i) => ({
      id: `${prefix}-${i}`,
      value: v,
      status: statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "sort") throw new Error(`BucketSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    const arrays: VisualArrayItem[][] = [
      this.makeItems(this.inputArr, this.inputStatuses, "in"),
    ];
    const labels: string[] = ["输入数组"];

    for (let b = 0; b < this.buckets.length; b++) {
      arrays.push(this.makeItems(this.buckets[b], this.bucketStatuses[b] || [], `b${b}`));
      labels.push(`桶 ${b}`);
    }

    arrays.push(this.makeItems(this.outputArr, this.outputStatuses, "out"));
    labels.push("输出数组");

    return { type: "multiarray", arrays, labels };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      n: { type: "number", value: this.inputArr.length, display: `${this.inputArr.length}` },
      bucketCount: { type: "number", value: this.buckets.length, display: `${this.buckets.length}` },
    };
  }

  private doSort(values: number[], recorder: TraceRecorder, line: number): void {
    if (values.length === 0) {
      recorder.record({
        type: "VISIT_NODE",
        title: "桶排序：数组为空",
        description: "没有数据需要排序",
        codeLine: line,
        targets: [],
      });
      return;
    }

    this.inputArr = [...values];
    this.inputStatuses = values.map(() => "default");
    this.outputArr = [];
    this.outputStatuses = [];

    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);
    const range = maxVal - minVal;
    const bucketCount = Math.max(1, Math.min(values.length, Math.ceil(Math.sqrt(values.length))));

    this.buckets = Array.from({ length: bucketCount }, () => []);
    this.bucketStatuses = Array.from({ length: bucketCount }, () => []);

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化桶排序",
      description: `输入: [${values.join(", ")}]，值域 [${minVal}, ${maxVal}]，桶数 ${bucketCount}`,
      codeLine: line,
      targets: [],
    });

    // 阶段 1: 分配到桶
    for (let i = 0; i < values.length; i++) {
      const bucketIdx = range === 0 ? 0 : Math.min(Math.floor(((values[i] - minVal) / range) * (bucketCount - 1)), bucketCount - 1);
      this.buckets[bucketIdx].push(values[i]);
      this.bucketStatuses[bucketIdx].push("default");
      this.inputStatuses[i] = "active";

      recorder.record({
        type: "FILL_CELL",
        title: `分配 ${values[i]} → 桶 ${bucketIdx}`,
        description: `input[${i}] = ${values[i]}，桶范围映射 → 桶 ${bucketIdx}`,
        codeLine: line,
        targets: [`in-${i}`],
      });

      this.inputStatuses[i] = "highlighted";
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "分配完成",
      description: this.buckets.map((b, i) => `桶 ${i}: [${b.join(", ")}]`).join("；"),
      codeLine: line,
      targets: [],
    });

    // 阶段 2: 桶内排序 + 收集
    for (let b = 0; b < bucketCount; b++) {
      if (this.buckets[b].length === 0) continue;

      this.buckets[b].sort((a, c) => a - c);
      for (let j = 0; j < this.buckets[b].length; j++) {
        this.bucketStatuses[b][j] = "active";
      }

      recorder.record({
        type: "FILL_CELL",
        title: `桶 ${b} 内排序`,
        description: `排序后: [${this.buckets[b].join(", ")}]`,
        codeLine: line,
        targets: [],
      });

      for (const val of this.buckets[b]) {
        this.outputArr.push(val);
        this.outputStatuses.push("highlighted");
      }

      for (let j = 0; j < this.buckets[b].length; j++) {
        this.bucketStatuses[b][j] = "highlighted";
      }
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "桶排序完成",
      description: `结果: [${this.outputArr.join(", ")}]。时间复杂度 O(n)（平均），空间复杂度 O(n + k)。`,
      codeLine: line,
      targets: [],
    });
  }
}
