import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class CScanDiskRuntime implements StructureRuntime {
  private headSequence: VisualArrayItem[] = [];
  private initialHead = 0;
  private totalSeek = 0;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `cscan-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    return {
      type: "array",
      items: this.headSequence,
      label: "磁头移动序列（C-SCAN）",
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "cscan":
        this.doCScan(args, recorder, line);
        break;
      default:
        throw new Error(`CScanDisk 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      初始磁头: { type: "number", value: this.initialHead, display: `${this.initialHead}` },
      总寻道距离: { type: "number", value: this.totalSeek, display: `${this.totalSeek}` },
      平均寻道: {
        type: "number",
        value:
          this.headSequence.length > 1
            ? +(this.totalSeek / (this.headSequence.length - 1)).toFixed(2)
            : 0,
        display:
          this.headSequence.length > 1
            ? `${(this.totalSeek / (this.headSequence.length - 1)).toFixed(2)}`
            : "0",
      },
    };
  }

  private doCScan(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.initialHead = Number(args[0]);
    const maxTrack = Number(args[1]);
    const requests = args.slice(2).map(Number);
    this.headSequence = [];
    this.totalSeek = 0;

    let currentPos = this.initialHead;

    // Record initial position
    this.headSequence.push({
      id: this.nextId(),
      value: currentPos,
      status: "highlighted",
    });

    // Separate requests into right (>= head) and left (< head)
    const right: number[] = [];
    const left: number[] = [];

    for (const track of requests) {
      if (track >= currentPos) {
        right.push(track);
      } else {
        left.push(track);
      }
    }

    right.sort((a, b) => a - b);
    left.sort((a, b) => a - b);

    // Phase 1: Move right (increasing) to max
    for (const track of right) {
      const distance = Math.abs(track - currentPos);
      this.totalSeek += distance;
      currentPos = track;

      this.headSequence.push({
        id: this.nextId(),
        value: track,
        status: "active",
      });

      recorder.record({
        type: "VISIT_NODE",
        title: `C-SCAN: 移动到磁道 ${track}（向右）`,
        description: `寻道距离=${distance}，累计寻道=${this.totalSeek}`,
        codeLine: line,
        targets: [`track-${track}`],
      });
    }

    // Move to max track if not already there
    if (currentPos < maxTrack && left.length > 0) {
      const distance = maxTrack - currentPos;
      this.totalSeek += distance;
      currentPos = maxTrack;

      this.headSequence.push({
        id: this.nextId(),
        value: maxTrack,
        status: "highlighted",
      });

      recorder.record({
        type: "VISIT_NODE",
        title: `C-SCAN: 移动到最大磁道 ${maxTrack}`,
        description: `跳到磁盘末端，寻道距离=${distance}，累计寻道=${this.totalSeek}`,
        codeLine: line,
        targets: [`track-${maxTrack}`],
      });
    }

    // Jump to 0 (circular)
    if (left.length > 0) {
      this.totalSeek += currentPos; // distance from current to 0
      currentPos = 0;

      this.headSequence.push({
        id: this.nextId(),
        value: 0,
        status: "removed",
      });

      recorder.record({
        type: "VISIT_NODE",
        title: "C-SCAN: 跳转到磁道 0",
        description: `循环跳转到起始端，寻道距离=${currentPos}（不计入），累计寻道=${this.totalSeek}`,
        codeLine: line,
        targets: ["track-0"],
      });

      // Phase 2: Continue right from 0 to service left-side requests
      for (const track of left) {
        const distance = Math.abs(track - currentPos);
        this.totalSeek += distance;
        currentPos = track;

        this.headSequence.push({
          id: this.nextId(),
          value: track,
          status: "active",
        });

        recorder.record({
          type: "VISIT_NODE",
          title: `C-SCAN: 移动到磁道 ${track}（继续向右）`,
          description: `寻道距离=${distance}，累计寻道=${this.totalSeek}`,
          codeLine: line,
          targets: [`track-${track}`],
        });
      }
    }
  }
}
