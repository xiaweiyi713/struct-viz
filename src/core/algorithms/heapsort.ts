import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class HeapSortRuntime implements StructureRuntime {
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
    if (method !== "sort") throw new Error(`HeapSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "HeapSort" };
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
    this.itemIds = values.map((_, i) => `hs-${i}`);
    this.statuses = values.map(() => "default");
    this.comparisons = 0;
    this.swapCount = 0;

    recorder.record({
      type: "VISIT_NODE", title: "初始化数组",
      description: `待排序数组: [${values.join(", ")}]，共 ${values.length} 个元素`,
      codeLine: line, targets: [],
    });

    const n = this.arr.length;

    // 建堆
    recorder.record({
      type: "VISIT_NODE", title: "开始建立最大堆",
      description: "从最后一个非叶节点开始，自底向上执行下沉操作，建立最大堆",
      codeLine: line, targets: [],
    });

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      this.siftDown(i, n, recorder, line);
    }

    recorder.record({
      type: "VISIT_NODE", title: "最大堆建立完成",
      description: `堆顶元素为 ${this.arr[0]}（最大值），堆结构: [${this.arr.join(", ")}]`,
      codeLine: line, targets: [this.itemIds[0]],
    });

    // 逐个提取
    for (let i = n - 1; i > 0; i--) {
      this.doSwap(0, i);
      this.swapCount++;
      this.statuses[i] = "highlighted";

      recorder.record({
        type: "SWAP", title: `交换堆顶 ${this.arr[i]} 到位置 ${i}`,
        description: `将最大值 ${this.arr[i]} 交换到数组末尾位置 ${i}，已排序部分增长`,
        codeLine: line, targets: [this.itemIds[0], this.itemIds[i]],
      });

      this.siftDown(0, i, recorder, line);
    }

    this.statuses[0] = "highlighted";
    recorder.record({
      type: "VISIT_NODE", title: "排序完成",
      description: `堆排序完成！结果: [${this.arr.join(", ")}]。比较: ${this.comparisons} 次，交换: ${this.swapCount} 次`,
      codeLine: line, targets: this.itemIds,
    });
  }

  private siftDown(start: number, end: number, recorder: TraceRecorder, line: number): void {
    let root = start;

    while (2 * root + 1 < end) {
      let child = 2 * root + 1;
      const rootVal = this.arr[root];

      this.statuses[root] = "active";
      this.statuses[child] = "active";

      // 比较左右子节点
      if (child + 1 < end) {
        this.comparisons++;
        this.statuses[child + 1] = "active";
        recorder.record({
          type: "COMPARE",
          title: `比较子节点 ${this.arr[child]} 和 ${this.arr[child + 1]}`,
          description: `左子 ${this.arr[child]} ${this.arr[child + 1] > this.arr[child] ? "<" : "≥"} 右子 ${this.arr[child + 1]}，选较大者`,
          codeLine: line,
          targets: [this.itemIds[child], this.itemIds[child + 1]],
        });

        if (this.arr[child + 1] > this.arr[child]) {
          child = child + 1;
        }
      }

      const childVal = this.arr[child];
      this.comparisons++;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${rootVal} 与子节点 ${childVal}`,
        description: `父节点 ${rootVal} ${rootVal >= childVal ? "≥" : "<"} 子节点 ${childVal}${rootVal < childVal ? "，需要下沉" : "，堆性质满足"}`,
        codeLine: line,
        targets: [this.itemIds[root], this.itemIds[child]],
      });

      if (rootVal >= childVal) {
        if (this.statuses[root] !== "highlighted") this.statuses[root] = "default";
        if (this.statuses[child] !== "highlighted") this.statuses[child] = "default";
        break;
      }

      this.doSwap(root, child);
      this.swapCount++;
      recorder.record({
        type: "SWAP",
        title: `下沉: 交换 ${rootVal} 和 ${childVal}`,
        description: `${rootVal} < ${childVal}，将 ${rootVal} 下沉到位置 ${child}`,
        codeLine: line,
        targets: [this.itemIds[root], this.itemIds[child]],
      });

      if (this.statuses[root] !== "highlighted") this.statuses[root] = "default";

      root = child;
    }

    if (this.statuses[root] !== "highlighted") this.statuses[root] = "default";
  }

  private doSwap(a: number, b: number): void {
    [this.arr[a], this.arr[b]] = [this.arr[b], this.arr[a]];
    [this.statuses[a], this.statuses[b]] = [this.statuses[b], this.statuses[a]];
    [this.itemIds[a], this.itemIds[b]] = [this.itemIds[b], this.itemIds[a]];
  }
}
