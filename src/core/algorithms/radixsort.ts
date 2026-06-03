import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class RadixSortRuntime implements StructureRuntime {
  private arr: number[] = [];
  private buckets: number[][] = [];
  private arrStatuses: string[] = [];
  private bucketStatuses: string[][] = [];

  private makeItems(a: number[], statuses: string[], prefix: string): VisualArrayItem[] {
    return a.map((v, i) => ({
      id: `${prefix}-${i}`,
      value: v,
      status: statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "sort") throw new Error(`RadixSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    const arrays: VisualArrayItem[][] = [
      this.makeItems(this.arr, this.arrStatuses, "main"),
    ];
    const labels: string[] = ["排序数组"];

    for (let b = 0; b < 10; b++) {
      const bucket = this.buckets[b] || [];
      const statuses = this.bucketStatuses[b] || [];
      arrays.push(this.makeItems(bucket, statuses, `b${b}`));
      labels.push(`桶 ${b}`);
    }

    return { type: "multiarray", arrays, labels };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      n: { type: "number", value: this.arr.length, display: `${this.arr.length}` },
    };
  }

  private doSort(values: number[], recorder: TraceRecorder, line: number): void {
    this.arr = [...values];
    this.arrStatuses = values.map(() => "default");
    this.buckets = Array.from({ length: 10 }, () => []);
    this.bucketStatuses = Array.from({ length: 10 }, () => []);

    const maxVal = Math.max(...values, 0);
    const maxDigit = maxVal === 0 ? 1 : Math.floor(Math.log10(maxVal)) + 1;

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化",
      description: `LSD 基数排序。数组: [${values.join(", ")}]，最大值 ${maxVal}，共 ${maxDigit} 位`,
      codeLine: line,
      pseudoLine: 0,
      targets: [],
    });

    let exp = 1;

    for (let d = 0; d < maxDigit; d++) {
      // 分配
      this.buckets = Array.from({ length: 10 }, () => []);
      this.bucketStatuses = Array.from({ length: 10 }, () => []);

      recorder.record({
        type: "VISIT_NODE",
        title: `第 ${d + 1} 趟（第 ${d + 1} 位，基数 ${exp}）`,
        description: `按第 ${d + 1} 位（个/十/百...）分配到桶中`,
        codeLine: line,
        pseudoLine: 2,
        targets: [],
      });

      for (let i = 0; i < this.arr.length; i++) {
        const digit = Math.floor(this.arr[i] / exp) % 10;
        this.buckets[digit].push(this.arr[i]);
        this.bucketStatuses[digit].push("default");
        this.arrStatuses[i] = "active";

        recorder.record({
          type: "DISTRIBUTE",
          title: `${this.arr[i]} → 桶 ${digit}`,
          description: `${this.arr[i]} 的第 ${d + 1} 位是 ${digit}`,
          codeLine: line,
          pseudoLine: 3,
          targets: [`main-${i}`],
        });

        this.arrStatuses[i] = "default";
      }

      // 收集
      this.arr = [];
      this.arrStatuses = [];

      for (let b = 0; b < 10; b++) {
        for (let j = 0; j < this.buckets[b].length; j++) {
          this.bucketStatuses[b][j] = "active";

          recorder.record({
            type: "COLLECT",
            title: `从桶 ${b} 取出 ${this.buckets[b][j]}`,
            description: `收集回主数组`,
            codeLine: line,
            pseudoLine: 3,
            targets: [`b${b}-${j}`],
          });

          this.arr.push(this.buckets[b][j]);
          this.arrStatuses.push("highlighted");
        }
      }

      this.arrStatuses = this.arr.map(() => "default");

      recorder.record({
        type: "MARK_FINAL",
        title: `第 ${d + 1} 趟完成`,
        description: `当前数组: [${this.arr.join(", ")}]`,
        codeLine: line,
        pseudoLine: 3,
        targets: [],
      });

      this.buckets = Array.from({ length: 10 }, () => []);
      this.bucketStatuses = Array.from({ length: 10 }, () => []);
      exp *= 10;
    }

    this.arrStatuses = this.arr.map(() => "highlighted");

    recorder.record({
      type: "VISIT_NODE",
      title: "排序完成",
      description: `基数排序完成！结果: [${this.arr.join(", ")}]。时间复杂度 O(d(n + k))，稳定排序。`,
      codeLine: line,
      pseudoLine: 5,
      targets: [],
    });
  }
}
