import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class BubbleSortRuntime implements StructureRuntime {
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
    if (method !== "sort") throw new Error(`BubbleSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "BubbleSort" };
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
    this.itemIds = values.map((_, i) => `bs-${i}`);
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
      let swapped = false;

      recorder.record({
        type: "VISIT_NODE",
        title: `第 ${i + 1} 趟冒泡`,
        description: `未排序区间 [0, ${n - 1 - i}]，已排序区间 [${n - i}, ${n - 1}]`,
        codeLine: line,
        targets: [],
      });

      for (let j = 0; j < n - 1 - i; j++) {
        this.statuses[j] = "active";
        this.statuses[j + 1] = "active";
        this.comparisons++;

        const shouldSwap = this.arr[j] > this.arr[j + 1];

        recorder.record({
          type: "COMPARE",
          title: `比较 ${this.arr[j]} 和 ${this.arr[j + 1]}`,
          description: `${this.arr[j]} ${shouldSwap ? ">" : "≤"} ${this.arr[j + 1]}${shouldSwap ? "，需要交换" : "，无需交换"}`,
          codeLine: line,
          targets: [this.itemIds[j], this.itemIds[j + 1]],
        });

        if (shouldSwap) {
          [this.arr[j], this.arr[j + 1]] = [this.arr[j + 1], this.arr[j]];
          [this.statuses[j], this.statuses[j + 1]] = [this.statuses[j + 1], this.statuses[j]];
          [this.itemIds[j], this.itemIds[j + 1]] = [this.itemIds[j + 1], this.itemIds[j]];
          this.swapCount++;
          swapped = true;

          recorder.record({
            type: "SWAP",
            title: `交换 ${this.arr[j + 1]} 和 ${this.arr[j]}`,
            description: `将较大值 ${this.arr[j + 1]} 向后移动`,
            codeLine: line,
            targets: [this.itemIds[j], this.itemIds[j + 1]],
          });
        }

        this.statuses[j] = "default";
        this.statuses[j + 1] = "default";
      }

      // 本趟最大值已到位
      this.statuses[n - 1 - i] = "highlighted";

      recorder.record({
        type: "MARK_FINAL",
        title: `第 ${i + 1} 趟完成`,
        description: `本趟最大值 ${this.arr[n - 1 - i]} 已到达位置 ${n - 1 - i}${!swapped ? "。本趟无交换，已有序" : ""}`,
        codeLine: line,
        targets: [this.itemIds[n - 1 - i]],
      });

      if (!swapped) break;
    }

    this.statuses[0] = "highlighted";

    recorder.record({
      type: "VISIT_NODE",
      title: "排序完成",
      description: `冒泡排序完成！结果: [${this.arr.join(", ")}]。比较: ${this.comparisons} 次，交换: ${this.swapCount} 次`,
      codeLine: line,
      targets: this.itemIds,
    });
  }
}
