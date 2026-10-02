import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class DiskSchedulerRuntime implements StructureRuntime {
  private headSequence: VisualArrayItem[] = [];
  private initialHead = 0;
  private totalSeek = 0;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `disk-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    return {
      type: "array",
      items: this.headSequence,
      label: "磁头移动序列",
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "fcfs":
        this.doFCFS(args, recorder, line);
        break;
      case "sstf":
        this.doSSTF(args, recorder, line);
        break;
      case "scan":
        this.doSCAN(args, recorder, line);
        break;
      default:
        throw new Error(`DiskScheduler 不支持方法 "${method}"`);
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
        value: this.headSequence.length > 0
          ? +(this.totalSeek / this.headSequence.length).toFixed(2)
          : 0,
        display: this.headSequence.length > 0
          ? `${(this.totalSeek / this.headSequence.length).toFixed(2)}`
          : "0",
      },
    };
  }

  private doFCFS(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.initialHead = Number(args[0]);
    const requests = args.slice(1).map(Number);
    this.headSequence = [];
    this.totalSeek = 0;

    let currentPos = this.initialHead;

    // Record initial position
    this.headSequence.push({
      id: this.nextId(),
      value: currentPos,
      status: "highlighted",
    });

    for (const track of requests) {
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
        title: `FCFS: 移动到磁道 ${track}`,
        description: `从 ${currentPos - distance < currentPos ? currentPos - distance : currentPos} 移动到磁道 ${track}，寻道距离=${distance}，累计寻道=${this.totalSeek}`,
        codeLine: line,
        targets: [`track-${track}`],
      });
    }
  }

  private doSSTF(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.initialHead = Number(args[0]);
    const remaining = args.slice(1).map(Number);
    this.headSequence = [];
    this.totalSeek = 0;

    let currentPos = this.initialHead;

    this.headSequence.push({
      id: this.nextId(),
      value: currentPos,
      status: "highlighted",
    });

    while (remaining.length > 0) {
      // Find closest request
      let closestIdx = 0;
      let closestDist = Math.abs(remaining[0] - currentPos);
      for (let i = 1; i < remaining.length; i++) {
        const dist = Math.abs(remaining[i] - currentPos);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      const track = remaining[closestIdx];
      this.totalSeek += closestDist;
      currentPos = track;
      remaining.splice(closestIdx, 1);

      this.headSequence.push({
        id: this.nextId(),
        value: track,
        status: "active",
      });

      recorder.record({
        type: "VISIT_NODE",
        title: `SSTF: 移动到磁道 ${track}`,
        description: `选择最近请求磁道 ${track}，寻道距离=${closestDist}，累计寻道=${this.totalSeek}，剩余 ${remaining.length} 个请求`,
        codeLine: line,
        targets: [`track-${track}`],
      });
    }
  }

  private doSCAN(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.initialHead = Number(args[0]);
    // args: head, maxTrack, ...requests, direction (1 = outward/increasing, -1 = inward/decreasing)
    // SCAN（电梯算法）定义：磁头沿当前方向一直移动到磁盘一端，服务沿途请求，然后反向。
    // 注意区别于 LOOK（只到最远请求处就折返）。
    const maxTrack = Number(args[1]);
    const direction = Number(args[args.length - 1]);
    const requests = args.slice(2, args.length - 1).map(Number);
    this.headSequence = [];
    this.totalSeek = 0;

    let currentPos = this.initialHead;

    this.headSequence.push({
      id: this.nextId(),
      value: currentPos,
      status: "highlighted",
    });

    const serveTrack = (track: number, phase: string) => {
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
        title: `SCAN: 移动到磁道 ${track}（${phase}）`,
        description: `寻道距离=${distance}，累计寻道=${this.totalSeek}`,
        codeLine: line,
        targets: [`track-${track}`],
      });
    };

    // Separate requests into two groups based on direction
    const left: number[] = []; // tracks < head
    const right: number[] = []; // tracks >= head

    for (const track of requests) {
      if (track < currentPos) {
        left.push(track);
      } else {
        right.push(track);
      }
    }

    left.sort((a, b) => a - b); // ascending
    right.sort((a, b) => a - b); // ascending

    if (direction === 1) {
      // Outward (increasing): serve right, go to the disk end, then reverse and serve left
      for (const track of right) {
        serveTrack(track, "向外");
      }
      // SCAN 到达磁盘末端（区别于 LOOK 的关键一步）
      if (left.length > 0 && currentPos < maxTrack) {
        serveTrack(maxTrack, "到达末端");
      }
      // Reverse: go left (descending)
      for (let i = left.length - 1; i >= 0; i--) {
        serveTrack(left[i], "反向");
      }
    } else {
      // Inward (decreasing): serve left, go to track 0, then reverse and serve right
      for (let i = left.length - 1; i >= 0; i--) {
        serveTrack(left[i], "向内");
      }
      // SCAN 到达磁盘始端（区别于 LOOK 的关键一步）
      if (right.length > 0 && currentPos > 0) {
        serveTrack(0, "到达始端");
      }
      // Reverse: go right (ascending)
      for (const track of right) {
        serveTrack(track, "反向");
      }
    }
  }
}
