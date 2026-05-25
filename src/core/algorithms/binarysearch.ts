import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class BinarySearchRuntime implements StructureRuntime {
  private arr: number[] = [];
  private itemIds: string[] = [];
  private statuses: string[] = [];

  private buildItems(): VisualArrayItem[] {
    return this.arr.map((v, i) => ({
      id: this.itemIds[i],
      value: v,
      status: this.statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "search") throw new Error(`BinarySearch 不支持方法 "${method}"`);
    const values = args.slice(0, -1).map((a) => Number(a));
    const target = Number(args[args.length - 1]);
    this.doSearch(values, target, recorder, line);
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "BinarySearch" };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      length: { type: "number", value: this.arr.length, display: `${this.arr.length}` },
    };
  }

  private doSearch(values: number[], target: number, recorder: TraceRecorder, line: number): void {
    this.arr = [...values];
    this.itemIds = values.map((_, i) => `bsearch-${i}`);
    this.statuses = values.map(() => "default");

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化有序数组",
      description: `有序数组: [${values.join(", ")}]，查找目标: ${target}`,
      codeLine: line,
      targets: [],
    });

    let low = 0;
    let high = this.arr.length - 1;

    while (low <= high) {
      // 重置所有状态，标记当前区间
      for (let i = 0; i < this.statuses.length; i++) {
        this.statuses[i] = "default";
      }
      for (let i = low; i <= high; i++) {
        this.statuses[i] = "active";
      }

      const mid = Math.floor((low + high) / 2);
      this.statuses[mid] = "highlighted";

      recorder.record({
        type: "COMPARE",
        title: `区间 [${low}, ${high}]，mid = ${mid}`,
        description: `low = ${low}，high = ${high}，mid = ${mid}，arr[mid] = ${this.arr[mid]}`,
        codeLine: line,
        targets: [this.itemIds[mid]],
      });

      if (this.arr[mid] === target) {
        this.statuses[mid] = "highlighted";

        recorder.record({
          type: "MARK_FINAL",
          title: `找到 ${target}，位置 ${mid}`,
          description: `arr[${mid}] = ${this.arr[mid]} = ${target}，查找成功`,
          codeLine: line,
          targets: [this.itemIds[mid]],
          payload: { found: true, index: mid },
        });
        return;
      }

      if (this.arr[mid] < target) {
        recorder.record({
          type: "COMPARE",
          title: `${this.arr[mid]} < ${target}，向右半区查找`,
          description: `arr[mid] = ${this.arr[mid]} < ${target}，排除左半区 [${low}, ${mid}]，新区间 [${mid + 1}, ${high}]`,
          codeLine: line,
          targets: this.itemIds.slice(low, mid + 1),
        });
        low = mid + 1;
      } else {
        recorder.record({
          type: "COMPARE",
          title: `${this.arr[mid]} > ${target}，向左半区查找`,
          description: `arr[mid] = ${this.arr[mid]} > ${target}，排除右半区 [${mid}, ${high}]，新区间 [${low}, ${mid - 1}]`,
          codeLine: line,
          targets: this.itemIds.slice(mid, high + 1),
        });
        high = mid - 1;
      }
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `未找到 ${target}`,
      description: `查找区间已缩小为空（low = ${low} > high = ${high}），${target} 不在数组中`,
      codeLine: line,
      targets: [],
      payload: { found: false },
    });
  }
}
