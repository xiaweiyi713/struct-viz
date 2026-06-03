import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class CountingSortRuntime implements StructureRuntime {
  private inputArr: number[] = [];
  private countArr: number[] = [];
  private outputArr: number[] = [];
  private inputStatuses: string[] = [];
  private countStatuses: string[] = [];
  private outputStatuses: string[] = [];

  private makeItems(arr: number[], statuses: string[], prefix: string): VisualArrayItem[] {
    return arr.map((v, i) => ({
      id: `${prefix}-${i}`,
      value: v,
      status: statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "sort") throw new Error(`CountingSort 不支持方法 "${method}"`);
    this.doSort(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: [
        this.makeItems(this.inputArr, this.inputStatuses, "in"),
        this.makeItems(this.countArr, this.countStatuses, "cnt"),
        this.makeItems(this.outputArr, this.outputStatuses, "out"),
      ],
      labels: ["输入数组", "计数数组", "输出数组"],
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      n: { type: "number", value: this.inputArr.length, display: `${this.inputArr.length}` },
      range: { type: "number", value: this.countArr.length, display: `${this.countArr.length}` },
    };
  }

  private doSort(values: number[], recorder: TraceRecorder, line: number): void {
    if (values.length === 0) {
      recorder.record({
        type: "VISIT_NODE",
        title: "计数排序：数组为空",
        description: "没有数据需要排序",
        codeLine: line,
        targets: [],
      });
      return;
    }

    this.inputArr = [...values];
    this.outputArr = new Array(values.length).fill(-1);
    this.inputStatuses = values.map(() => "default");
    this.outputStatuses = values.map(() => "default");

    const maxVal = Math.max(...values);
    const k = maxVal + 1;
    this.countArr = new Array(k).fill(0);
    this.countStatuses = new Array(k).fill("default");

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化",
      description: `输入数组: [${values.join(", ")}]，值域 [0, ${maxVal}]，计数数组大小 ${k}`,
      codeLine: line,
      pseudoLine: 2,
      targets: [],
    });

    // 阶段 1: 计数
    for (let i = 0; i < values.length; i++) {
      this.inputStatuses[i] = "active";
      this.countStatuses[values[i]] = "active";
      this.countArr[values[i]]++;

      recorder.record({
        type: "FILL_CELL",
        title: `统计 ${values[i]} 的出现次数`,
        description: `input[${i}] = ${values[i]}，count[${values[i]}] = ${this.countArr[values[i]]}`,
        codeLine: line,
        pseudoLine: 4,
        targets: [`in-${i}`, `cnt-${values[i]}`],
      });

      this.inputStatuses[i] = "default";
      this.countStatuses[values[i]] = "default";
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "计数完成",
      description: `计数数组: [${this.countArr.join(", ")}]`,
      codeLine: line,
      pseudoLine: 4,
      targets: [],
    });

    // 阶段 2: 累加（前缀和）
    for (let i = 1; i < k; i++) {
      this.countStatuses[i] = "active";
      this.countStatuses[i - 1] = "active";
      this.countArr[i] += this.countArr[i - 1];

      recorder.record({
        type: "FILL_CELL",
        title: `前缀和: count[${i}] += count[${i - 1}]`,
        description: `count[${i}] = ${this.countArr[i]}`,
        codeLine: line,
        pseudoLine: 6,
        targets: [`cnt-${i}`, `cnt-${i - 1}`],
      });

      this.countStatuses[i] = "default";
      this.countStatuses[i - 1] = "default";
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "前缀和计算完成",
      description: `累加后: [${this.countArr.join(", ")}]`,
      codeLine: line,
      pseudoLine: 6,
      targets: [],
    });

    // 阶段 3: 反向填充输出
    for (let i = values.length - 1; i >= 0; i--) {
      const val = values[i];
      this.inputStatuses[i] = "active";
      this.countStatuses[val] = "active";

      this.countArr[val]--;
      const pos = this.countArr[val];
      this.outputArr[pos] = val;
      this.outputStatuses[pos] = "highlighted";

      recorder.record({
        type: "COLLECT",
        title: `放置 ${val} → output[${pos}]`,
        description: `从右向左扫描 input[${i}] = ${val}，count[${val}] - 1 = ${pos}`,
        codeLine: line,
        pseudoLine: 8,
        targets: [`in-${i}`, `cnt-${val}`, `out-${pos}`],
      });

      this.inputStatuses[i] = "default";
      this.countStatuses[val] = "default";
    }

    for (let i = 0; i < this.outputArr.length; i++) {
      this.outputStatuses[i] = "highlighted";
    }

    recorder.record({
      type: "VISIT_NODE",
      title: "排序完成",
      description: `计数排序完成！结果: [${this.outputArr.join(", ")}]。时间复杂度 O(n + k)，稳定排序。`,
      codeLine: line,
      pseudoLine: 10,
      targets: [],
    });
  }
}
