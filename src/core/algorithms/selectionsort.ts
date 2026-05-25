import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class SelectionSortRuntime implements StructureRuntime {
  private arr: number[] = [];
  private itemIds: string[] = [];
  private statuses: string[] = [];
  private comparisons = 0;
  private swapCount = 0;

  private buildItems(): VisualArrayItem[] {
    return this.arr.map((v, i) => ({
      id: this.itemIds[i],
      value: v,
      status: this.statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "sort") throw new Error(`SelectionSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "SelectionSort" };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      length: { type: "number", value: this.arr.length, display: `${this.arr.length}` },
      comparisons: { type: "number", value: this.comparisons, display: `${this.comparisons}` },
      swaps: { type: "number", value: this.swapCount, display: `${this.swapCount}` },
    };
  }

  private doSort(values: number[], recorder: TraceRecorder, line: number): void {
    this.arr = [...values];
    this.itemIds = values.map((_, i) => `ss-${i}`);
    this.statuses = values.map(() => "default");
    this.comparisons = 0;
    this.swapCount = 0;

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化数组",
      description: `待排序数组: [${values.join(", ")}]，共 ${values.length} 个元素`,
      codeLine: line,
      targets: [],
    });

    const n = this.arr.length;

    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;
      this.statuses[i] = "active";

      recorder.record({
        type: "VISIT_NODE",
        title: `第 ${i + 1} 趟选择`,
        description: `在未排序区间 [${i}, ${n - 1}] 中寻找最小元素`,
        codeLine: line,
        targets: [this.itemIds[i]],
      });

      for (let j = i + 1; j < n; j++) {
        this.statuses[j] = "active";
        this.comparisons++;

        recorder.record({
          type: "COMPARE",
          title: `比较 ${this.arr[j]} 和当前最小值 ${this.arr[minIdx]}`,
          description: `arr[${j}] = ${this.arr[j]} ${this.arr[j] < this.arr[minIdx] ? "<" : "≥"} arr[${minIdx}] = ${this.arr[minIdx]}`,
          codeLine: line,
          targets: [this.itemIds[j], this.itemIds[minIdx]],
        });

        if (this.arr[j] < this.arr[minIdx]) {
          this.statuses[minIdx] = i === minIdx ? "active" : "default";
          minIdx = j;
        } else {
          this.statuses[j] = "default";
        }
      }

      if (minIdx !== i) {
        this.statuses[i] = "highlighted";
        this.statuses[minIdx] = "highlighted";

        recorder.record({
          type: "SELECT_MIN",
          title: `找到最小值 ${this.arr[minIdx]}，与 arr[${i}] = ${this.arr[i]} 交换`,
          description: `最小元素在位置 ${minIdx}，交换到位置 ${i}`,
          codeLine: line,
          targets: [this.itemIds[i], this.itemIds[minIdx]],
        });

        [this.arr[i], this.arr[minIdx]] = [this.arr[minIdx], this.arr[i]];
        this.swapCount++;

        recorder.record({
          type: "SWAP",
          title: `交换 ${this.arr[minIdx]} 和 ${this.arr[i]}`,
          description: `位置 ${i} 现在是 ${this.arr[i]}`,
          codeLine: line,
          targets: [this.itemIds[i], this.itemIds[minIdx]],
        });
      } else {
        recorder.record({
          type: "SELECT_MIN",
          title: `arr[${i}] = ${this.arr[i]} 已是最小值，无需交换`,
          description: `位置 ${i} 的元素已是未排序区间的最小值`,
          codeLine: line,
          targets: [this.itemIds[i]],
        });
      }

      for (let k = i + 1; k < n; k++) this.statuses[k] = "default";
      this.statuses[i] = "highlighted";

      recorder.record({
        type: "MARK_FINAL",
        title: `第 ${i + 1} 趟完成`,
        description: `${this.arr[i]} 已到达最终位置 ${i}`,
        codeLine: line,
        targets: [this.itemIds[i]],
      });
    }

    this.statuses[n - 1] = "highlighted";

    recorder.record({
      type: "VISIT_NODE",
      title: "排序完成",
      description: `选择排序完成！结果: [${this.arr.join(", ")}]。比较: ${this.comparisons} 次，交换: ${this.swapCount} 次`,
      codeLine: line,
      targets: this.itemIds,
    });
  }
}
