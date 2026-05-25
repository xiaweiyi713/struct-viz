import type {
  TraceEvent,
  TraceFrame,
  TraceSnapshot,
} from "../../types";

export type SnapshotProvider = () => TraceSnapshot;

let globalEventCounter = 0;

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
   */
  record(
    event: Omit<TraceEvent, "id" | "step">,
  ): TraceFrame {
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

  /** 获取已记录的全部帧 */
  getFrames(): TraceFrame[] {
    return this.frames;
  }

  /** 重置录制器状态（清空帧和计数器） */
  reset(): void {
    this.frames = [];
    this.stepCounter = 0;
    resetEventCounter();
  }
}
