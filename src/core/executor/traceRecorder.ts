import type {
  TraceEvent,
  TraceFrame,
  TraceSnapshot,
} from "../../types";

export type SnapshotProvider = () => TraceSnapshot;

let globalEventCounter = 0;

/**
 * 单次执行允许记录的最大帧数。
 * 每帧都携带全量快照深拷贝，无上限时大输入（如 3000 个逆序数做快排）
 * 会让帧数爆炸导致 Worker 堆内存耗尽。超限后 record() 抛错，
 * Runtime 会将其转为面向用户的执行错误并停止后续语句。
 */
export const MAX_FRAMES = 20000;

export class FrameLimitExceededError extends Error {
  constructor(limit: number = MAX_FRAMES) {
    super(
      `动画帧数超过上限（${limit} 帧），已停止执行。请减小输入规模后重试。`,
    );
    this.name = "FrameLimitExceededError";
  }
}

export function resetEventCounter(): void {
  globalEventCounter = 0;
}

function nextEventId(): string {
  globalEventCounter += 1;
  return `evt-${globalEventCounter}`;
}

export class TraceRecorder {
  private frames: TraceFrame[] = [];
  private stepCounter = 0;
  private getSnapshot: SnapshotProvider;

  constructor(getSnapshot: SnapshotProvider) {
    this.getSnapshot = getSnapshot;
  }

  /**
   * 记录一个 trace 事件。
   * 调用后自动递增 step，生成唯一 id，并捕获当前快照组成 TraceFrame。
   * 帧数达到 MAX_FRAMES 时抛 FrameLimitExceededError（防 OOM）。
   */
  record(
    event: Omit<TraceEvent, "id" | "step">,
  ): TraceFrame {
    if (this.frames.length >= MAX_FRAMES) {
      throw new FrameLimitExceededError();
    }

    const fullEvent: TraceEvent = {
      id: nextEventId(),
      step: this.stepCounter,
      ...event,
    };

    const snapshot = this.getSnapshot();

    const frame: TraceFrame = {
      step: this.stepCounter,
      event: fullEvent,
      snapshot,
    };

    this.frames.push(frame);
    this.stepCounter += 1;

    return frame;
  }

  /** 获取当前 step（下一个将要使用的 step 编号） */
  get currentStep(): number {
    return this.stepCounter;
  }

  /** 获取已记录的全部帧（返回拷贝，防止外部篡改内部状态） */
  getFrames(): TraceFrame[] {
    return [...this.frames];
  }

  /** 重置录制器状态（清空帧和计数器） */
  reset(): void {
    this.frames = [];
    this.stepCounter = 0;
    resetEventCounter();
  }
}
