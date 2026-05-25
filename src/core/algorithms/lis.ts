import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class LISRuntime implements StructureRuntime {
  private arr: VisualArrayItem[] = [];
  private dp: VisualArrayItem[] = [];

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    if (method !== "solve")
      throw new Error(`LIS 不支持方法 "${method}"`);
    this.doSolve(args.map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: [[...this.arr], [...this.dp]],
      labels: ["arr", "dp"],
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      n: {
        type: "number",
        value: this.arr.length,
        display: `${this.arr.length}`,
      },
    };
  }

  private doSolve(
    nums: number[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    const n = nums.length;
    if (n === 0) {
      recorder.record({
        type: "MARK_FINAL",
        title: "LIS 长度 = 0",
        description: "输入数组为空",
        codeLine: line,
        targets: [],
      });
      return;
    }

    const dpValues: number[] = new Array(n).fill(1);

    // 初始化可视化的 arr 和 dp 数组
    this.arr = nums.map((v, i) => ({
      id: `arr-${i}`,
      value: v,
      status: "default",
    }));
    this.dp = nums.map((_, i) => ({
      id: `dp-${i}`,
      value: 1,
      status: "default",
    }));

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化",
      description: `输入数组 arr = [${nums.join(", ")}]，长度 ${n}。初始化 dp[i] = 1（每个元素自身构成长度为 1 的子序列）`,
      codeLine: line,
      targets: nums.map((_, i) => `dp-${i}`),
    });

    // O(n^2) DP 求解
    for (let i = 1; i < n; i++) {
      // 标记当前计算的 i
      this.arr[i].status = "active";
      this.dp[i].status = "active";

      recorder.record({
        type: "VISIT_NODE",
        title: `计算 dp[${i}]，当前元素 arr[${i}] = ${nums[i]}`,
        description: `开始寻找以 arr[${i}] = ${nums[i]} 结尾的最长递增子序列`,
        codeLine: line,
        targets: [`arr-${i}`, `dp-${i}`],
      });

      for (let j = 0; j < i; j++) {
        // 标记正在比较的 j
        this.arr[j].status = "active";

        if (nums[j] < nums[i]) {
          const candidate = dpValues[j] + 1;

          recorder.record({
            type: "COMPARE",
            title: `arr[${j}]=${nums[j]} < arr[${i}]=${nums[i]}，dp[${j}]+1 = ${dpValues[j]}+1 = ${candidate}`,
            description: `比较: arr[${j}]=${nums[j]} < arr[${i}]=${nums[i]}，候选值 dp[${j}]+1 = ${candidate}，当前 dp[${i}] = ${dpValues[i]}`,
            codeLine: line,
            targets: [`arr-${j}`, `arr-${i}`, `dp-${j}`, `dp-${i}`],
          });

          if (candidate > dpValues[i]) {
            dpValues[i] = candidate;
            this.dp[i].value = candidate;

            recorder.record({
              type: "UPDATE_DISTANCE",
              title: `更新 dp[${i}] = ${candidate}`,
              description: `dp[${j}]+1 = ${candidate} > 当前 dp[${i}]，更新 dp[${i}] = ${candidate}`,
              codeLine: line,
              targets: [`dp-${i}`, `dp-${j}`],
            });
          }
        } else {
          recorder.record({
            type: "COMPARE",
            title: `arr[${j}]=${nums[j]} >= arr[${i}]=${nums[i]}，跳过`,
            description: `arr[${j}]=${nums[j]} 不小于 arr[${i}]=${nums[i]}，不满足递增条件，跳过`,
            codeLine: line,
            targets: [`arr-${j}`, `arr-${i}`],
          });
        }

        // 恢复 j 的状态
        this.arr[j].status = "default";
      }

      // dp[i] 计算完成
      this.dp[i].status = "highlighted";

      recorder.record({
        type: "FILL_CELL",
        title: `dp[${i}] = ${dpValues[i]} 计算完成`,
        description: `以 arr[${i}]=${nums[i]} 结尾的最长递增子序列长度为 ${dpValues[i]}`,
        codeLine: line,
        targets: [`dp-${i}`],
      });

      // 恢复 arr[i] 的状态
      this.arr[i].status = "default";
    }

    // 找到 LIS 最大长度
    let maxLen = dpValues[0];
    let maxIdx = 0;
    for (let i = 1; i < n; i++) {
      if (dpValues[i] > maxLen) {
        maxLen = dpValues[i];
        maxIdx = i;
      }
    }

    // 回溯找 LIS 路径
    const lisPath: number[] = [maxIdx];
    let curIdx = maxIdx;
    while (lisPath.length < maxLen) {
      for (let j = curIdx - 1; j >= 0; j--) {
        if (nums[j] < nums[curIdx] && dpValues[j] === dpValues[curIdx] - 1) {
          lisPath.unshift(j);
          curIdx = j;
          break;
        }
      }
    }

    // 标记回溯路径上的元素
    for (const idx of lisPath) {
      this.arr[idx].status = "highlighted";
      this.dp[idx].status = "highlighted";
    }

    recorder.record({
      type: "BACKTRACK",
      title: `回溯 LIS 路径`,
      description: `从 dp 最大值位置 dp[${maxIdx}]=${maxLen} 开始回溯，LIS 对应下标: [${lisPath.join(", ")}]`,
      codeLine: line,
      targets: lisPath.flatMap((idx) => [`arr-${idx}`, `dp-${idx}`]),
    });

    const lisSequence = lisPath.map((idx) => nums[idx]);
    recorder.record({
      type: "MARK_FINAL",
      title: `LIS 长度 = ${maxLen}`,
      description: `最长递增子序列: [${lisSequence.join(", ")}]，对应下标: [${lisPath.join(", ")}]`,
      codeLine: line,
      targets: lisPath.flatMap((idx) => [`arr-${idx}`, `dp-${idx}`]),
    });
  }
}
