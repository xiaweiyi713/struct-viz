import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── SlidingWindowRuntime ──

type FrameStatus = "default" | "active" | "highlighted" | "removed";

interface WindowState {
  frames: FrameStatus[];
  description: string;
}

export class SlidingWindowRuntime implements StructureRuntime {
  private windowSize = 0;
  private totalFrames = 0;
  private lostFrames = new Set<number>();
  private states: WindowState[] = [];

  private buildArrays(): VisualArrayItem[][] {
    return this.states.map((state, si) =>
      state.frames.map((status, fi) => ({
        id: `s${si}-f${fi}`,
        value: `F${fi}`,
        status,
      }))
    );
  }

  private buildLabels(): string[] {
    return this.states.map((s, i) => `时刻${i + 1}: ${s.description}`);
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    const numArgs = args.map((a) => Number(a));
    switch (method) {
      case "gbn":
        this.doGBN(numArgs, recorder, line);
        break;
      case "sr":
        this.doSR(numArgs, recorder, line);
        break;
      default:
        throw new Error(`SlidingWindow 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: this.buildArrays(),
      labels: this.buildLabels(),
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      windowSize: { type: "number", value: this.windowSize, display: `${this.windowSize}` },
      totalFrames: { type: "number", value: this.totalFrames, display: `${this.totalFrames}` },
      lostFrames: {
        type: "string",
        value: [...this.lostFrames].join(","),
        display: [...this.lostFrames].map((f) => `F${f}`).join(", ") || "无",
      },
    };
  }

  private snapshot(
    frames: FrameStatus[],
    description: string,
    recorder: TraceRecorder,
    line: number,
    title: string,
    targets: string[],
    eventType: "VISIT_NODE" | "MARK_FINAL" | "COMPARE" = "VISIT_NODE",
  ): void {
    this.states.push({ frames: [...frames], description });
    recorder.record({
      type: eventType,
      title,
      description,
      codeLine: line,
      targets,
    });
  }

  /** Go-Back-N 协议 */
  private doGBN(params: number[], recorder: TraceRecorder, line: number): void {
    this.windowSize = params[0];
    this.totalFrames = params[1];
    this.lostFrames = new Set(params.slice(2));
    this.states = [];

    const total = this.totalFrames;
    const ws = this.windowSize;
    const frames: FrameStatus[] = new Array(total).fill("default");
    const acked = new Set<number>();

    // 初始状态
    this.snapshot(frames, "初始状态", recorder, line, "GBN 初始化", [], "VISIT_NODE");

    let base = 0;

    // 发送阶段
    while (base < total) {
      const end = Math.min(base + ws, total);

      // 发送窗口内的帧
      for (let i = base; i < end; i++) {
        frames[i] = "active";
      }

      this.snapshot(
        frames,
        `发送窗口 [F${base}-F${end - 1}]`,
        recorder,
        line,
        `发送窗口 [F${base}..F${end - 1}]`,
        Array.from({ length: end - base }, (_, i) => `f${base + i}`),
        "VISIT_NODE",
      );

      // 接收 ACK
      for (let i = base; i < end; i++) {
        if (this.lostFrames.has(i)) {
          // 帧丢失
          frames[i] = "removed";
          this.snapshot(
            frames,
            `F${i} 丢失! 等待超时...`,
            recorder,
            line,
            `F${i} 丢失`,
            [`f${i}`],
            "COMPARE",
          );

          // 超时重传：从 base 开始重传所有已发送未确认的帧
          const retransEnd = Math.min(base + ws, total);
          for (let j = base; j < retransEnd; j++) {
            frames[j] = "highlighted";
          }

          this.snapshot(
            frames,
            `超时重传窗口 [F${base}-F${retransEnd - 1}]`,
            recorder,
            line,
            `超时重传 [F${base}..F${retransEnd - 1}]`,
            Array.from({ length: retransEnd - base }, (_, j) => `f${base + j}`),
            "VISIT_NODE",
          );

          // 假设重传成功，继续正常 ACK
          for (let j = i; j < retransEnd; j++) {
            frames[j] = "highlighted";
            acked.add(j);
          }

          this.snapshot(
            frames,
            `重传成功，ACK [F${i}-F${retransEnd - 1}]`,
            recorder,
            line,
            `重传 ACK 确认`,
            Array.from({ length: retransEnd - i }, (_, j) => `f${i + j}`),
            "MARK_FINAL",
          );

          base = retransEnd;
          break;
        } else {
          // 帧成功接收
          frames[i] = "highlighted";
          acked.add(i);

          this.snapshot(
            frames,
            `收到 ACK F${i}`,
            recorder,
            line,
            `ACK F${i}`,
            [`f${i}`],
            "MARK_FINAL",
          );
        }
      }

      // 如果没有丢失，移动 base
      if (acked.has(base)) {
        // 滑动窗口
        while (base < total && acked.has(base)) {
          frames[base] = "highlighted";
          base++;
        }
      }
    }

    // 最终状态
    const finalFrames: FrameStatus[] = new Array(total).fill("highlighted");
    this.snapshot(
      finalFrames,
      "所有帧确认完毕",
      recorder,
      line,
      "GBN 传输完成",
      [],
      "MARK_FINAL",
    );
  }

  /** 选择性重传协议 */
  private doSR(params: number[], recorder: TraceRecorder, line: number): void {
    this.windowSize = params[0];
    this.totalFrames = params[1];
    this.lostFrames = new Set(params.slice(2));
    this.states = [];

    const total = this.totalFrames;
    const ws = this.windowSize;
    const frames: FrameStatus[] = new Array(total).fill("default");
    const acked = new Set<number>();

    // 初始状态
    this.snapshot(frames, "初始状态", recorder, line, "SR 初始化", [], "VISIT_NODE");

    let base = 0;

    while (base < total) {
      const end = Math.min(base + ws, total);

      // 发送窗口内的帧
      for (let i = base; i < end; i++) {
        if (!acked.has(i)) {
          frames[i] = "active";
        }
      }

      this.snapshot(
        frames,
        `发送窗口 [F${base}-F${end - 1}]`,
        recorder,
        line,
        `发送窗口 [F${base}..F${end - 1}]`,
        Array.from({ length: end - base }, (_, i) => `f${base + i}`),
        "VISIT_NODE",
      );

      // 接收 ACK
      for (let i = base; i < end; i++) {
        if (acked.has(i)) continue;

        if (this.lostFrames.has(i)) {
          frames[i] = "removed";
          this.snapshot(
            frames,
            `F${i} 丢失! 等待超时...`,
            recorder,
            line,
            `F${i} 丢失`,
            [`f${i}`],
            "COMPARE",
          );

          // SR 只重传丢失的帧
          frames[i] = "highlighted";
          this.snapshot(
            frames,
            `选择性重传 F${i}`,
            recorder,
            line,
            `选择性重传 F${i}`,
            [`f${i}`],
            "VISIT_NODE",
          );

          // 假设重传成功
          acked.add(i);
          frames[i] = "highlighted";
          this.snapshot(
            frames,
            `重传成功，ACK F${i}`,
            recorder,
            line,
            `ACK F${i}（重传）`,
            [`f${i}`],
            "MARK_FINAL",
          );
        } else {
          acked.add(i);
          frames[i] = "highlighted";
          this.snapshot(
            frames,
            `收到 ACK F${i}`,
            recorder,
            line,
            `ACK F${i}`,
            [`f${i}`],
            "MARK_FINAL",
          );
        }
      }

      // 滑动窗口
      while (base < total && acked.has(base)) {
        frames[base] = "highlighted";
        base++;
      }
    }

    // 最终状态
    const finalFrames: FrameStatus[] = new Array(total).fill("highlighted");
    this.snapshot(
      finalFrames,
      "所有帧确认完毕",
      recorder,
      line,
      "SR 传输完成",
      [],
      "MARK_FINAL",
    );
  }
}
