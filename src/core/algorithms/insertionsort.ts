import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class InsertionSortRuntime implements StructureRuntime {
  private arr: number[] = [];
  private itemIds: string[] = [];
  private statuses: string[] = [];
  private comparisons = 0;
  private shiftCount = 0;

  private buildItems(): VisualArrayItem[] {
    return this.arr.map((v, i) => ({
      id: this.itemIds[i],
      value: v,
      status: this.statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "sort") throw new Error(`InsertionSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "InsertionSort" };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      length: { type: "number", value: this.arr.length, display: `${this.arr.length}` },
      comparisons: { type: "number", value: this.comparisons, display: `${this.comparisons}` },
      shifts: { type: "number", value: this.shiftCount, display: `${this.shiftCount}` },
    };
  }

  private doSort(values: number[], recorder: TraceRecorder, line: number): void {
    this.arr = [...values];
    this.itemIds = values.map((_, i) => `is-${i}`);
    this.statuses = values.map(() => "default");
    this.comparisons = 0;
    this.shiftCount = 0;

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化数组",
      description: `待排序数组: [${values.join(", ")}]，共 ${values.length} 个元素`,
      codeLine: line,
      targets: [],
    });

    // 第一个元素视为已排序
    this.statuses[0] = "highlighted";

    recorder.record({
      type: "MARK_FINAL",
      title: "初始有序区",
      description: `元素 ${this.arr[0]} 视为已排序区间 [0, 0]`,
      codeLine: line,
      targets: [this.itemIds[0]],
    });

    for (let i = 1; i < this.arr.length; i++) {
      const key = this.arr[i];
      this.statuses[i] = "active";

      recorder.record({
        type: "VISIT_NODE",
        title: `取出元素 ${key}（位置 ${i}）`,
        description: `有序区: [${this.arr.slice(0, i).join(", ")}]，取出无序区首个元素 ${key}`,
        codeLine: line,
        targets: [this.itemIds[i]],
      });

      let j = i - 1;

      while (j >= 0) {
        this.comparisons++;
        this.statuses[j] = "active";

        const shouldShift = this.arr[j] > key;

        recorder.record({
          type: "COMPARE",
          title: `比较 ${key} 与 ${this.arr[j]}`,
          description: `${this.arr[j]} ${shouldShift ? ">" : "≤"} ${key}${shouldShift ? "，后移" : "，找到插入位置"}`,
          codeLine: line,
          targets: [this.itemIds[j]],
        });

        if (shouldShift) {
          this.arr[j + 1] = this.arr[j];
          this.statuses[j + 1] = this.statuses[j];
          this.statuses[j] = "default";
          this.shiftCount++;

          recorder.record({
            type: "SWAP",
            title: `后移 ${this.arr[j + 1]}`,
            description: `将 ${this.arr[j + 1]} 从位置 ${j} 后移到位置 ${j + 1}`,
            codeLine: line,
            targets: [this.itemIds[j + 1]],
          });

          j--;
        } else {
          this.statuses[j] = "highlighted";
          break;
        }
      }

      // 插入到正确位置
      this.arr[j + 1] = key;
      this.statuses[j + 1] = "highlighted";

      recorder.record({
        type: "LINK_NODE",
        title: `插入 ${key} 到位置 ${j + 1}`,
        description: `将 ${key} 插入到有序区的位置 ${j + 1}。有序区: [${this.arr.slice(0, i + 1).join(", ")}]`,
        codeLine: line,
        targets: [this.itemIds[j + 1]],
      });
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "排序完成",
      description: `插入排序完成！结果: [${this.arr.join(", ")}]。比较: ${this.comparisons} 次，移动: ${this.shiftCount} 次`,
      codeLine: line,
      targets: this.itemIds,
    });
  }
}
