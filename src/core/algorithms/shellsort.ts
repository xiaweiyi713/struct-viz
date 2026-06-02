import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class ShellSortRuntime implements StructureRuntime {
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
    if (method !== "sort") throw new Error(`ShellSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "ShellSort" };
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
    this.itemIds = values.map((_, i) => `sh-${i}`);
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

    // Knuth 增量序列: 1, 4, 13, 40, ...
    const gaps: number[] = [];
    let gap = 1;
    while (gap < n) {
      gaps.unshift(gap);
      gap = gap * 3 + 1;
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `增量序列: [${gaps.join(", ")}]`,
      description: `使用 Knuth 增量序列，共 ${gaps.length} 趟`,
      codeLine: line,
      targets: [],
    });

    for (const g of gaps) {
      recorder.record({
        type: "VISIT_NODE",
        title: `增量 gap = ${g}`,
        description: `对间隔为 ${g} 的子序列分别进行插入排序`,
        codeLine: line,
        targets: [],
      });

      for (let i = g; i < n; i++) {
        const temp = this.arr[i];
        const tempId = this.itemIds[i];
        let j = i;

        this.statuses[i] = "active";

        while (j >= g) {
          this.statuses[j - g] = "active";
          this.comparisons++;

          recorder.record({
            type: "COMPARE",
            title: `比较 arr[${j}] = ${temp} 和 arr[${j - g}] = ${this.arr[j - g]}`,
            description: `间隔 ${g} 插入排序`,
            codeLine: line,
            targets: [this.itemIds[j], this.itemIds[j - g]],
          });

          if (this.arr[j - g] > temp) {
            this.arr[j] = this.arr[j - g];
            this.itemIds[j] = this.itemIds[j - g];
            this.swapCount++;

            recorder.record({
              type: "SWAP",
              title: `后移: arr[${j}] = ${this.arr[j - g]}`,
              description: `${this.arr[j - g]} > ${temp}，将较大值后移`,
              codeLine: line,
              targets: [this.itemIds[j], this.itemIds[j - g]],
            });

            this.statuses[j - g] = "default";
            j -= g;
          } else {
            this.statuses[j - g] = "default";
            break;
          }
        }

        this.arr[j] = temp;
        this.itemIds[j] = tempId;
        this.statuses = this.arr.map(() => "default");
      }

      recorder.record({
        type: "MARK_FINAL",
        title: `gap = ${g} 排序完成`,
        description: `当前数组: [${this.arr.join(", ")}]`,
        codeLine: line,
        targets: [],
      });
    }

    this.statuses = this.arr.map(() => "highlighted");

    recorder.record({
      type: "VISIT_NODE",
      title: "排序完成",
      description: `希尔排序完成！结果: [${this.arr.join(", ")}]。比较: ${this.comparisons} 次，移动: ${this.swapCount} 次`,
      codeLine: line,
      targets: this.itemIds,
    });
  }
}
