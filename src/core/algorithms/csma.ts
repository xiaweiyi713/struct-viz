import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── CSMARuntime ──

export class CSMARuntime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [];
  private labels: string[] = [];
  private lastOp = "";

  private makeItem(id: string, value: number | string, status: VisualArrayItem["status"] = "default"): VisualArrayItem {
    return { id, value, status };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "collide":
        this.doCollide(Number(args[0]), Number(args[1]), recorder, line);
        break;
      default:
        throw new Error(`CSMA 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: this.arrays,
      labels: this.labels,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      operation: { type: "string", value: this.lastOp, display: this.lastOp || "无" },
    };
  }

  // ── CSMA/CD 二进制指数退避 ──

  private doCollide(stations: number, collisions: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `CSMA/CD ${stations}站点, ${collisions}次冲突`;
    this.arrays = [];
    this.labels = [];

    // 每个站点的退避时间槽记录
    const stationSlots: number[][] = Array.from({ length: stations }, () => []);
    const stationCurrentK: number[] = new Array(stations).fill(0); // 每个站点的冲突次数

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "CSMA/CD 二进制指数退避模拟",
      description: `${stations} 个站点，最多 ${collisions} 次冲突。第 k 次冲突后，随机等待 [0, 2^k - 1] 个时间槽`,
      codeLine: line,
    });

    // 展示初始状态
    const initItems: VisualArrayItem[] = [];
    for (let s = 0; s < stations; s++) {
      initItems.push(this.makeItem(`init-${s}`, `站${s}`, "default"));
    }
    this.arrays.push(initItems);
    this.labels.push(`初始状态: ${stations} 个站点准备发送`);

    for (let round = 1; round <= collisions; round++) {
      // 所有站点发生冲突，各自增加 k 并计算退避
      const backoffValues: number[] = [];

      for (let s = 0; s < stations; s++) {
        stationCurrentK[s] = Math.min(stationCurrentK[s] + 1, 10); // k 上限为 10
        const k = stationCurrentK[s];
        const maxSlot = Math.pow(2, k) - 1;
        // 使用确定性模拟：不同站点选不同值
        const backoff = (s + round) % (maxSlot + 1);
        stationSlots[s].push(backoff);
        backoffValues.push(backoff);
      }

      const maxK = Math.min(round, 10);
      const range = Math.pow(2, maxK) - 1;

      recorder.record({
        type: "COMPARE",
        title: `第 ${round} 次冲突（k=${maxK}）`,
        description: `冲突后各站点退避: ${backoffValues.map((v, i) => `站${i}=${v}`).join(", ")}。等待范围: [0, ${range}]，2^${maxK} - 1 = ${range} 个时间槽`,
        codeLine: line,
      });

      // 展示当前退避情况
      const backoffItems: VisualArrayItem[] = [];
      for (let s = 0; s < stations; s++) {
        const slot = stationSlots[s][stationSlots[s].length - 1];
        backoffItems.push(this.makeItem(`backoff-${round}-${s}`, slot, "active"));
      }
      this.arrays.push(backoffItems);
      this.labels.push(`第${round}次冲突后退避: [${backoffValues.join(", ")}]`);

      // 确定谁先发送（退避值最小的）
      const minBackoff = Math.min(...backoffValues);
      const winners = backoffValues.reduce((acc: number[], v, i) => {
        if (v === minBackoff) acc.push(i);
        return acc;
      }, []);

      if (winners.length === 1) {
        const resultItems: VisualArrayItem[] = [];
        for (let s = 0; s < stations; s++) {
          resultItems.push(this.makeItem(`result-${round}-${s}`, backoffValues[s], s === winners[0] ? "highlighted" : "default"));
        }
        this.arrays.push(resultItems);
        this.labels.push(`站${winners[0]} 获得信道（最小退避=${minBackoff}）`);

        recorder.record({
          type: "MARK_FINAL",
          title: `站${winners[0]} 获得发送权`,
          description: `退避时间最短，站点 ${winners[0]} 在 ${minBackoff} 个时间槽后发送`,
          codeLine: line,
          targets: [],
          payload: { winner: winners[0], backoff: minBackoff },
        });

        // 重置获胜站点
        stationCurrentK[winners[0]] = 0;
      } else {
        recorder.record({
          type: "COMPARE",
          title: `多个站点退避相同（${winners.map(w => `站${w}`).join(", ")}），将再次冲突`,
          description: `最小退避值 ${minBackoff} 有 ${winners.length} 个站点选择，将再次发生冲突`,
          codeLine: line,
        });
      }
    }

    // 展示每个站点所有退避记录
    const summaryItems: VisualArrayItem[] = [];
    for (let s = 0; s < stations; s++) {
      summaryItems.push(this.makeItem(`sum-${s}`, stationSlots[s].join("→"), "computed"));
    }
    this.arrays.push(summaryItems);
    this.labels.push(`各站点退避历史`);

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "CSMA/CD 退避模拟完成",
      description: `共 ${collisions} 轮冲突。各站点退避序列: ${stationSlots.map((slots, i) => `站${i}: [${slots.join(",")}]`).join("; ")}`,
      codeLine: line,
    });
  }
}
