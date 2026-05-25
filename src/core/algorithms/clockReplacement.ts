import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class ClockReplacementRuntime implements StructureRuntime {
  private frameCount = 0;
  private frames: (number | null)[] = [];
  private refBits: number[] = [];
  private pointer = 0;
  private pageReferences: number[] = [];
  private hitCount = 0;
  private faultCount = 0;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `clk-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    const frameItems: VisualArrayItem[] = this.frames.map((f, idx) => ({
      id: this.nextId(),
      value: f !== null ? f : "-",
      status: idx === this.pointer ? ("highlighted" as const) : ("default" as const),
    }));

    const refItems: VisualArrayItem[] = this.refBits.map((bit, idx) => ({
      id: this.nextId(),
      value: `${idx}:${bit}`,
      status: idx === this.pointer ? ("highlighted" as const) : ("default" as const),
    }));

    const pageItems: VisualArrayItem[] = this.pageReferences.map((ref, idx) => ({
      id: this.nextId(),
      value: ref,
      status: ("default" as const),
    }));

    return {
      type: "multiarray",
      arrays: [frameItems, refItems, pageItems],
      labels: ["帧内容", "引用位(指针)", "页面引用"],
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "clock":
        this.doClock(args, recorder, line);
        break;
      default:
        throw new Error(`ClockReplacement 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      帧数: { type: "number", value: this.frameCount, display: `${this.frameCount}` },
      指针位置: { type: "number", value: this.pointer, display: `${this.pointer}` },
      命中次数: { type: "number", value: this.hitCount, display: `${this.hitCount}` },
      缺页次数: { type: "number", value: this.faultCount, display: `${this.faultCount}` },
      缺页率: {
        type: "string",
        value:
          this.faultCount > 0 || this.hitCount > 0
            ? `${((this.faultCount / (this.faultCount + this.hitCount)) * 100).toFixed(1)}%`
            : "0%",
        display:
          this.faultCount > 0 || this.hitCount > 0
            ? `${((this.faultCount / (this.faultCount + this.hitCount)) * 100).toFixed(1)}%`
            : "0%",
      },
    };
  }

  private doClock(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.frameCount = Number(args[0]);
    this.frames = new Array(this.frameCount).fill(null);
    this.refBits = new Array(this.frameCount).fill(0);
    this.pointer = 0;
    this.pageReferences = args.slice(1).map(Number);
    this.hitCount = 0;
    this.faultCount = 0;

    for (let i = 0; i < this.pageReferences.length; i++) {
      const page = this.pageReferences[i];

      // Check if page already in a frame
      const existingIdx = this.frames.indexOf(page);
      if (existingIdx !== -1) {
        // Hit - set reference bit
        this.hitCount++;
        this.refBits[existingIdx] = 1;

        recorder.record({
          type: "CHECK_INVARIANT",
          title: `CLOCK: 访问页面 ${page} — 命中`,
          description: `页面 ${page} 已在帧${existingIdx}中（命中），设置引用位=1。指针=${this.pointer}，帧状态: [${this.frames.map((f) => f ?? "-").join(", ")}]，引用位: [${this.refBits.join(", ")}]`,
          codeLine: line,
          targets: [`frame-${existingIdx}`],
        });
        continue;
      }

      // Page fault - use clock algorithm to find a victim
      this.faultCount++;
      while (this.refBits[this.pointer] === 1) {
        // Give second chance: clear reference bit and advance
        this.refBits[this.pointer] = 0;
        this.pointer = (this.pointer + 1) % this.frameCount;
      }

      // Replace at current pointer
      const victimFrame = this.pointer;
      const replaced = this.frames[victimFrame];
      this.frames[victimFrame] = page;
      this.refBits[victimFrame] = 1;
      const oldPointer = this.pointer;
      this.pointer = (this.pointer + 1) % this.frameCount;

      recorder.record({
        type: "FILL_CELL",
        title: `CLOCK: 访问页面 ${page} — 缺页`,
        description: `页面 ${page} 不在帧中（缺页），${replaced !== null ? `替换帧${victimFrame}中的页面${replaced}（引用位为0）` : `装入帧${victimFrame}`}。指针从${oldPointer}移到${this.pointer}，帧状态: [${this.frames.map((f) => f ?? "-").join(", ")}]，引用位: [${this.refBits.join(", ")}]`,
        codeLine: line,
        targets: [`frame-${victimFrame}`],
      });
    }
  }
}
