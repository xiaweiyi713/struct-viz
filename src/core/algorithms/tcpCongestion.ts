import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── TCPCongestionRuntime ──

export class TCPCongestionRuntime implements StructureRuntime {
  private items: VisualArrayItem[] = [];
  private lastOp = "";
  private cwndHistory: number[] = [];
  private ssthreshHistory: number[] = [];

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
      case "simulate":
        this.doSimulate(Number(args[0] ?? 20), Number(args[1] ?? 12), recorder, line);
        break;
      default:
        throw new Error(`TCPCongestion 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "array",
      items: this.items,
      label: "TCP 拥塞窗口",
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      operation: { type: "string", value: this.lastOp, display: this.lastOp || "无" },
      cwnd: { type: "number", value: this.cwndHistory[this.cwndHistory.length - 1] ?? 0, display: `${this.cwndHistory[this.cwndHistory.length - 1] ?? 0}` },
    };
  }

  // ── TCP 拥塞控制模拟 ──

  private doSimulate(rttCount: number, lossAt: number, recorder: TraceRecorder, line: number): void {
    this.lastOp = `TCP 拥塞控制 (${rttCount} RTT, 丢包@RTT${lossAt})`;
    this.items = [];
    this.cwndHistory = [];
    this.ssthreshHistory = [];

    const MSS = 1; // 最大报文段长度（单位化）
    let cwnd = 1; // 拥塞窗口（MSS 数量）
    let ssthresh = 64; // 慢启动阈值
    let phase = "slow-start"; // 当前阶段

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "TCP 拥塞控制初始化",
      description: `初始 cwnd = ${cwnd} MSS，ssthresh = ${ssthresh} MSS，共 ${rttCount} 个 RTT，第 ${lossAt} 个 RTT 发生丢包`,
      codeLine: line,
    });

    for (let rtt = 1; rtt <= rttCount; rtt++) {
      this.cwndHistory.push(cwnd);
      this.ssthreshHistory.push(ssthresh);

      // 创建当前 cwnd 的可视化
      this.items = this.cwndHistory.map((c, i) => {
        const isActive = i === this.cwndHistory.length - 1;
        const isLoss = i + 1 === lossAt;
        let status: VisualArrayItem["status"] = "default";
        if (isActive && isLoss) status = "removed";
        else if (isActive) status = "active";
        else if (isLoss) status = "removed";
        return this.makeItem(`rtt-${i}`, c, status);
      });

      const prevCwnd = cwnd;

      // 检查是否在丢包 RTT
      if (rtt === lossAt) {
        // 3 次重复 ACK → 快重传 + 快恢复
        const newSsthresh = Math.max(Math.floor(cwnd / 2), 2);
        cwnd = newSsthresh + 3; // 快恢复：ssthresh + 3
        ssthresh = newSsthresh;
        phase = "fast-recovery";

        recorder.record({
          type: "COMPARE",
          title: `RTT ${rtt}: 检测到丢包！3次重复ACK`,
          description: `快重传！cwnd ${prevCwnd} → ssthresh = ${ssthresh}，快恢复 cwnd = ${cwnd}。进入快恢复阶段`,
          codeLine: line,
        });
      } else {
        // 正常传输
        if (phase === "slow-start") {
          // 慢启动：指数增长
          cwnd *= 2;
          if (cwnd >= ssthresh) {
            phase = "congestion-avoidance";
            cwnd = ssthresh; // 精确到达 ssthresh 时切换
          }

          recorder.record({
            type: "PUSH",
            title: `RTT ${rtt}: 慢启动 cwnd ${prevCwnd} → ${cwnd}`,
            description: `cwnd < ssthresh (${ssthresh})，指数增长。${cwnd >= ssthresh ? "达到 ssthresh，切换到拥塞避免" : ""}`,
            codeLine: line,
          });
        } else if (phase === "congestion-avoidance") {
          // 拥塞避免：线性增长
          cwnd += MSS;

          recorder.record({
            type: "FILL_CELL",
            title: `RTT ${rtt}: 拥塞避免 cwnd ${prevCwnd} → ${cwnd}`,
            description: `cwnd ≥ ssthresh (${ssthresh})，线性增长（每 RTT +1 MSS）`,
            codeLine: line,
          });
        } else if (phase === "fast-recovery") {
          // 快恢复后进入拥塞避免
          cwnd = ssthresh;
          phase = "congestion-avoidance";

          recorder.record({
            type: "VISIT_NODE",
            title: `RTT ${rtt}: 快恢复结束 cwnd → ${cwnd}`,
            description: `快恢复结束，cwnd 设为 ssthresh (${ssthresh})，进入拥塞避免`,
            codeLine: line,
          });
        }
      }

      // 限制 cwnd 最大值
      cwnd = Math.min(cwnd, 128);
    }

    // 最终状态
    this.items = this.cwndHistory.map((c, i) => {
      const isLoss = i + 1 === lossAt;
      return this.makeItem(`rtt-${i}`, c, isLoss ? "removed" : "default");
    });

    const maxCwnd = Math.max(...this.cwndHistory);
    recorder.record({
      type: "MARK_FINAL",
      title: "TCP 拥塞控制模拟完成",
      description: `cwnd 变化序列: [${this.cwndHistory.join(", ")}]。最大 cwnd: ${maxCwnd}。经历阶段: 慢启动${lossAt <= rttCount ? " → 快重传/快恢复 → 拥塞避免" : " → 拥塞避免"}`,
      codeLine: line,
      payload: {
        cwndHistory: this.cwndHistory,
        ssthreshHistory: this.ssthreshHistory,
        lossAt,
      },
    });
  }
}
