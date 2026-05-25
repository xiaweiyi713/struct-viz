import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class PageReplacerRuntime implements StructureRuntime {
  private frameCount = 0;
  private frames: (number | null)[] = [];
  private pageReferences: number[] = [];
  private hitCount = 0;
  private faultCount = 0;
  private idCounter = 0;
  // History of frame states at each step
  private frameHistory: (number | null)[][] = [];

  private nextId(): string {
    this.idCounter += 1;
    return `pr-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    const arrays: VisualArrayItem[][] = [];

    // Build arrays from frame history - each frame's history over time
    for (let f = 0; f < this.frameCount; f++) {
      const items: VisualArrayItem[] = [];
      for (let step = 0; step < this.frameHistory.length; step++) {
        const val = this.frameHistory[step][f];
        items.push({
          id: this.nextId(),
          value: val !== null ? val : "-",
          status: val !== null ? "default" : "removed",
        });
      }
      arrays.push(items);
    }

    // Last array: page reference sequence
    const refItems: VisualArrayItem[] = this.pageReferences.map((ref, idx) => ({
      id: this.nextId(),
      value: ref,
      status: idx < this.frameHistory.length ? "highlighted" : "default",
    }));
    arrays.push(refItems);

    const labels: string[] = [];
    for (let f = 0; f < this.frameCount; f++) {
      labels.push(`帧${f}`);
    }
    labels.push("页面引用");

    return {
      type: "multiarray",
      arrays,
      labels,
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "fifo":
        this.doFIFO(args, recorder, line);
        break;
      case "lru":
        this.doLRU(args, recorder, line);
        break;
      case "opt":
        this.doOPT(args, recorder, line);
        break;
      default:
        throw new Error(`PageReplacer 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      帧数: { type: "number", value: this.frameCount, display: `${this.frameCount}` },
      命中次数: { type: "number", value: this.hitCount, display: `${this.hitCount}` },
      缺页次数: { type: "number", value: this.faultCount, display: `${this.faultCount}` },
      缺页率: {
        type: "string",
        value: this.faultCount > 0 || this.hitCount > 0
          ? `${((this.faultCount / (this.faultCount + this.hitCount)) * 100).toFixed(1)}%`
          : "0%",
        display: this.faultCount > 0 || this.hitCount > 0
          ? `${((this.faultCount / (this.faultCount + this.hitCount)) * 100).toFixed(1)}%`
          : "0%",
      },
    };
  }

  private snapshotFrames(): void {
    this.frameHistory.push([...this.frames]);
  }

  private doFIFO(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.frameCount = Number(args[0]);
    this.frames = new Array(this.frameCount).fill(null);
    this.pageReferences = args.slice(1).map(Number);
    this.hitCount = 0;
    this.faultCount = 0;
    this.frameHistory = [];

    let pointer = 0; // FIFO pointer

    for (let i = 0; i < this.pageReferences.length; i++) {
      const page = this.pageReferences[i];

      if (this.frames.includes(page)) {
        // Hit
        this.hitCount++;
        this.snapshotFrames();
        recorder.record({
          type: "CHECK_INVARIANT",
          title: `FIFO: 访问页面 ${page} — 命中`,
          description: `页面 ${page} 已在帧中（命中）。帧状态: [${this.frames.map(f => f ?? "-").join(", ")}]`,
          codeLine: line,
          targets: [`frame-${page}`],
        });
      } else {
        // Page fault
        this.faultCount++;
        const replaced = this.frames[pointer];
        this.frames[pointer] = page;
        this.snapshotFrames();
        recorder.record({
          type: "FILL_CELL",
          title: `FIFO: 访问页面 ${page} — 缺页`,
          description: `页面 ${page} 不在帧中（缺页），${replaced !== null ? `替换帧${pointer}中的页面${replaced}` : `装入帧${pointer}`}。帧状态: [${this.frames.map(f => f ?? "-").join(", ")}]`,
          codeLine: line,
          targets: [`frame-${pointer}`],
        });
        pointer = (pointer + 1) % this.frameCount;
      }
    }
  }

  private doLRU(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.frameCount = Number(args[0]);
    this.frames = new Array(this.frameCount).fill(null);
    this.pageReferences = args.slice(1).map(Number);
    this.hitCount = 0;
    this.faultCount = 0;
    this.frameHistory = [];

    // Track last used time for each frame
    const lastUsed: number[] = new Array(this.frameCount).fill(-1);
    let timeCounter = 0;

    for (let i = 0; i < this.pageReferences.length; i++) {
      const page = this.pageReferences[i];
      const existingIdx = this.frames.indexOf(page);

      if (existingIdx !== -1) {
        // Hit
        this.hitCount++;
        lastUsed[existingIdx] = timeCounter++;
        this.snapshotFrames();
        recorder.record({
          type: "CHECK_INVARIANT",
          title: `LRU: 访问页面 ${page} — 命中`,
          description: `页面 ${page} 已在帧${existingIdx}中（命中）。帧状态: [${this.frames.map(f => f ?? "-").join(", ")}]`,
          codeLine: line,
          targets: [`frame-${existingIdx}`],
        });
      } else {
        // Page fault - find LRU frame
        this.faultCount++;
        let lruIdx = 0;
        let lruTime = Infinity;
        for (let f = 0; f < this.frameCount; f++) {
          if (lastUsed[f] < lruTime) {
            lruTime = lastUsed[f];
            lruIdx = f;
          }
        }
        const replaced = this.frames[lruIdx];
        this.frames[lruIdx] = page;
        lastUsed[lruIdx] = timeCounter++;
        this.snapshotFrames();
        recorder.record({
          type: "FILL_CELL",
          title: `LRU: 访问页面 ${page} — 缺页`,
          description: `页面 ${page} 不在帧中（缺页），${replaced !== null ? `替换最久未用的帧${lruIdx}（原页面${replaced}）` : `装入帧${lruIdx}`}。帧状态: [${this.frames.map(f => f ?? "-").join(", ")}]`,
          codeLine: line,
          targets: [`frame-${lruIdx}`],
        });
      }
    }
  }

  private doOPT(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.frameCount = Number(args[0]);
    this.frames = new Array(this.frameCount).fill(null);
    this.pageReferences = args.slice(1).map(Number);
    this.hitCount = 0;
    this.faultCount = 0;
    this.frameHistory = [];

    for (let i = 0; i < this.pageReferences.length; i++) {
      const page = this.pageReferences[i];

      if (this.frames.includes(page)) {
        // Hit
        this.hitCount++;
        this.snapshotFrames();
        recorder.record({
          type: "CHECK_INVARIANT",
          title: `OPT: 访问页面 ${page} — 命中`,
          description: `页面 ${page} 已在帧中（命中）。帧状态: [${this.frames.map(f => f ?? "-").join(", ")}]`,
          codeLine: line,
          targets: [`frame-${page}`],
        });
      } else {
        // Page fault - find page that won't be used for longest time
        this.faultCount++;

        let targetIdx = 0;
        const emptyIdx = this.frames.indexOf(null);
        if (emptyIdx !== -1) {
          targetIdx = emptyIdx;
        } else {
          // Find the frame whose page is used farthest in future (or never)
          let farthest = -1;
          for (let f = 0; f < this.frameCount; f++) {
            const framePage = this.frames[f]!;
            let nextUse = Infinity;
            for (let j = i + 1; j < this.pageReferences.length; j++) {
              if (this.pageReferences[j] === framePage) {
                nextUse = j;
                break;
              }
            }
            if (nextUse > farthest) {
              farthest = nextUse;
              targetIdx = f;
            }
          }
        }

        const replaced = this.frames[targetIdx];
        this.frames[targetIdx] = page;
        this.snapshotFrames();
        recorder.record({
          type: "FILL_CELL",
          title: `OPT: 访问页面 ${page} — 缺页`,
          description: `页面 ${page} 不在帧中（缺页），${replaced !== null ? `替换最远才用的帧${targetIdx}（原页面${replaced}）` : `装入帧${targetIdx}`}。帧状态: [${this.frames.map(f => f ?? "-").join(", ")}]`,
          codeLine: line,
          targets: [`frame-${targetIdx}`],
        });
      }
    }
  }
}
