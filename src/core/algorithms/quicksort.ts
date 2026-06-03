import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class QuickSortRuntime implements StructureRuntime {
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

  private snapshot(recorder: TraceRecorder, _line: number, event: Omit<import("../../types").TraceEvent, "id" | "step">): void {
    this.syncStatuses();
    recorder.record(event);
  }

  private syncStatuses(): void {
    // statuses always reflect current state
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "sort") throw new Error(`QuickSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "QuickSort" };
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
    this.itemIds = values.map((_, i) => `qs-${i}`);
    this.statuses = values.map(() => "default");
    this.comparisons = 0;
    this.swapCount = 0;

    this.snapshot(recorder, line, {
      type: "VISIT_NODE",
      title: "初始化数组",
      description: `待排序数组: [${values.join(", ")}]，共 ${values.length} 个元素`,
      codeLine: line,
      pseudoLine: 0,
      targets: [],
    });

    this.quickSort(0, this.arr.length - 1, recorder, line);

    this.statuses = this.statuses.map(() => "highlighted");
    this.snapshot(recorder, line, {
      type: "VISIT_NODE",
      title: "排序完成",
      description: `快速排序完成！结果: [${this.arr.join(", ")}]。比较: ${this.comparisons} 次，交换: ${this.swapCount} 次`,
      codeLine: line,
      pseudoLine: 13,
      targets: this.itemIds,
    });
  }

  private quickSort(lo: number, hi: number, recorder: TraceRecorder, line: number): void {
    if (lo >= hi) return;

    for (let i = lo; i <= hi; i++) {
      if (this.statuses[i] !== "highlighted") this.statuses[i] = "active";
    }

    this.snapshot(recorder, line, {
      type: "COMPARE",
      title: `处理子数组 [${lo}..${hi}]`,
      description: `对区间 [${lo}, ${hi}] 快速排序，选取基准元素 ${this.arr[hi]}`,
      codeLine: line,
      pseudoLine: 1,
      targets: this.itemIds.slice(lo, hi + 1),
    });

    const pivotIdx = this.partition(lo, hi, recorder, line);

    this.statuses[pivotIdx] = "highlighted";
    for (let i = lo; i <= hi; i++) {
      if (i !== pivotIdx && this.statuses[i] !== "highlighted") {
        this.statuses[i] = "default";
      }
    }

    this.quickSort(lo, pivotIdx - 1, recorder, line);
    this.quickSort(pivotIdx + 1, hi, recorder, line);
  }

  private partition(lo: number, hi: number, recorder: TraceRecorder, line: number): number {
    const pivot = this.arr[hi];
    this.statuses[hi] = "highlighted";

    this.snapshot(recorder, line, {
      type: "COMPARE",
      title: `选择基准 pivot = ${pivot}`,
      description: `选取最右元素 ${pivot} 作为基准，开始划分`,
      codeLine: line,
      pseudoLine: 7,
      targets: [this.itemIds[hi]],
    });

    let i = lo - 1;

    for (let j = lo; j < hi; j++) {
      this.comparisons++;
      this.statuses[j] = "active";

      const val = this.arr[j];
      this.snapshot(recorder, line, {
        type: "COMPARE",
        title: `比较 ${val} 与 pivot ${pivot}`,
        description: `${val} ${val <= pivot ? "≤" : ">"} ${pivot}${val <= pivot ? "，移入左分区" : ""}`,
        codeLine: line,
        pseudoLine: 10,
        targets: [this.itemIds[j], this.itemIds[hi]],
      });

      if (val <= pivot) {
        i++;
        if (i !== j) {
          this.doSwap(i, j);
          this.swapCount++;
          this.snapshot(recorder, line, {
            type: "SWAP",
            title: `交换位置 ${i} 和 ${j}`,
            description: `将 ${this.arr[j]} 移到左分区位置 ${i}`,
            codeLine: line,
            pseudoLine: 11,
            targets: [this.itemIds[i], this.itemIds[j]],
          });
        }
      }

      if (this.statuses[j] !== "highlighted") this.statuses[j] = "default";
    }

    this.doSwap(i + 1, hi);
    this.swapCount++;
    this.snapshot(recorder, line, {
      type: "SWAP",
      title: `基准 ${pivot} 归位到位置 ${i + 1}`,
      description: `pivot ${pivot} 放到正确位置 ${i + 1}，左侧均 ≤ ${pivot}，右侧均 > ${pivot}`,
      codeLine: line,
      pseudoLine: 12,
      targets: [this.itemIds[i + 1], this.itemIds[hi]],
    });

    return i + 1;
  }

  private doSwap(a: number, b: number): void {
    [this.arr[a], this.arr[b]] = [this.arr[b], this.arr[a]];
    [this.statuses[a], this.statuses[b]] = [this.statuses[b], this.statuses[a]];
    [this.itemIds[a], this.itemIds[b]] = [this.itemIds[b], this.itemIds[a]];
  }
}
