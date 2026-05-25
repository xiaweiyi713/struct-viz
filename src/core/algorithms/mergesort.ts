import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class MergeSortRuntime implements StructureRuntime {
  private arr: number[] = [];
  private itemIds: string[] = [];
  private statuses: string[] = [];
  private comparisons = 0;
  private mergeCount = 0;

  private buildItems(): VisualArrayItem[] {
    return this.arr.map((v, i) => ({
      id: this.itemIds[i],
      value: v,
      status: this.statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "sort") throw new Error(`MergeSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "MergeSort" };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      length: { type: "number", value: this.arr.length, display: `${this.arr.length}` },
      comparisons: { type: "number", value: this.comparisons, display: `${this.comparisons}` },
      merges: { type: "number", value: this.mergeCount, display: `${this.mergeCount}` },
    };
  }

  private doSort(values: number[], recorder: TraceRecorder, line: number): void {
    this.arr = [...values];
    this.itemIds = values.map((_, i) => `ms-${i}`);
    this.statuses = values.map(() => "default");
    this.comparisons = 0;
    this.mergeCount = 0;

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化数组",
      description: `待排序数组: [${values.join(", ")}]，共 ${values.length} 个元素`,
      codeLine: line,
      targets: [],
    });

    this.mergeSort(0, this.arr.length - 1, recorder, line);

    // 标记全部完成
    for (let i = 0; i < this.statuses.length; i++) {
      this.statuses[i] = "highlighted";
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "排序完成",
      description: `归并排序完成！结果: [${this.arr.join(", ")}]。比较: ${this.comparisons} 次，合并: ${this.mergeCount} 次`,
      codeLine: line,
      targets: this.itemIds,
    });
  }

  private mergeSort(left: number, right: number, recorder: TraceRecorder, line: number): void {
    if (left >= right) return;

    const mid = Math.floor((left + right) / 2);

    // 高亮当前分割区间
    for (let i = left; i <= right; i++) {
      this.statuses[i] = "active";
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `分割区间 [${left}, ${right}]`,
      description: `区间 [${left}, ${right}]，中点 mid = ${mid}。分为 [${left}, ${mid}] 和 [${mid + 1}, ${right}]`,
      codeLine: line,
      targets: this.itemIds.slice(left, right + 1),
    });

    // 重置状态
    for (let i = left; i <= right; i++) {
      this.statuses[i] = "default";
    }

    this.mergeSort(left, mid, recorder, line);
    this.mergeSort(mid + 1, right, recorder, line);
    this.merge(left, mid, right, recorder, line);
  }

  private merge(left: number, mid: number, right: number, recorder: TraceRecorder, line: number): void {
    const leftArr = this.arr.slice(left, mid + 1);
    const rightArr = this.arr.slice(mid + 1, right + 1);
    let i = 0, j = 0, k = left;

    // 高亮合并区间
    for (let x = left; x <= right; x++) {
      this.statuses[x] = "active";
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `合并 [${left}, ${mid}] 和 [${mid + 1}, ${right}]`,
      description: `左半: [${leftArr.join(", ")}]，右半: [${rightArr.join(", ")}]`,
      codeLine: line,
      targets: this.itemIds.slice(left, right + 1),
    });

    while (i < leftArr.length && j < rightArr.length) {
      this.comparisons++;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${leftArr[i]} 和 ${rightArr[j]}`,
        description: `${leftArr[i]} ${leftArr[i] <= rightArr[j] ? "≤" : ">"} ${rightArr[j]}，选取较小值`,
        codeLine: line,
        targets: [this.itemIds[left + i], this.itemIds[mid + 1 + j]],
      });

      if (leftArr[i] <= rightArr[j]) {
        this.arr[k] = leftArr[i];
        this.statuses[k] = "highlighted";
        i++;
      } else {
        this.arr[k] = rightArr[j];
        this.statuses[k] = "highlighted";
        j++;
      }
      k++;
    }

    while (i < leftArr.length) {
      this.arr[k] = leftArr[i];
      this.statuses[k] = "highlighted";
      i++;
      k++;
    }

    while (j < rightArr.length) {
      this.arr[k] = rightArr[j];
      this.statuses[k] = "highlighted";
      j++;
      k++;
    }

    this.mergeCount++;

    recorder.record({
      type: "SWAP",
      title: `合并完成 [${left}, ${right}]`,
      description: `合并结果: [${this.arr.slice(left, right + 1).join(", ")}]`,
      codeLine: line,
      targets: this.itemIds.slice(left, right + 1),
    });

    // 重置状态
    for (let x = left; x <= right; x++) {
      this.statuses[x] = "default";
    }
  }
}
