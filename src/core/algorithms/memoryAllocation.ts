import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface MemoryBlock {
  id: string;
  startAddr: number;
  size: number;
  allocated: boolean;
  processName: string;
}

export class MemoryAllocatorRuntime implements StructureRuntime {
  private totalSize = 0;
  private blocks: MemoryBlock[] = [];
  private idCounter = 0;
  private requestCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `mem-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    // Build array representing memory block states
    // Positive value = allocated size, Negative value = free size
    const items: VisualArrayItem[] = this.blocks.map((block) => ({
      id: block.id,
      value: block.allocated ? block.size : -block.size,
      status: block.allocated ? "active" : "default" as const,
    }));

    return {
      type: "multiarray",
      arrays: [items],
      labels: ["内存块"],
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "firstFit":
        this.doFirstFit(args, recorder, line);
        break;
      case "bestFit":
        this.doBestFit(args, recorder, line);
        break;
      case "worstFit":
        this.doWorstFit(args, recorder, line);
        break;
      default:
        throw new Error(`MemoryAllocator 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    const usedSize = this.blocks
      .filter((b) => b.allocated)
      .reduce((sum, b) => sum + b.size, 0);
    const freeSize = this.blocks
      .filter((b) => !b.allocated)
      .reduce((sum, b) => sum + b.size, 0);

    return {
      总大小: { type: "number", value: this.totalSize, display: `${this.totalSize}` },
      已用: { type: "number", value: usedSize, display: `${usedSize}` },
      空闲: { type: "number", value: freeSize, display: `${freeSize}` },
      利用率: {
        type: "string",
        value: this.totalSize > 0 ? `${((usedSize / this.totalSize) * 100).toFixed(1)}%` : "0%",
        display: this.totalSize > 0 ? `${((usedSize / this.totalSize) * 100).toFixed(1)}%` : "0%",
      },
    };
  }

  private allocate(requestSize: number, strategy: "firstFit" | "bestFit" | "worstFit", recorder: TraceRecorder, line: number): void {
    this.requestCounter++;
    const reqName = `R${this.requestCounter}`;

    // Find suitable block
    let targetIdx = -1;
    if (strategy === "firstFit") {
      for (let i = 0; i < this.blocks.length; i++) {
        if (!this.blocks[i].allocated && this.blocks[i].size >= requestSize) {
          targetIdx = i;
          break;
        }
      }
    } else if (strategy === "bestFit") {
      // bestFit: find smallest fitting free block
      let bestSize = Infinity;
      for (let i = 0; i < this.blocks.length; i++) {
        if (!this.blocks[i].allocated && this.blocks[i].size >= requestSize) {
          if (this.blocks[i].size < bestSize) {
            bestSize = this.blocks[i].size;
            targetIdx = i;
          }
        }
      }
    } else {
      // worstFit: find largest fitting free block
      let worstSize = -1;
      for (let i = 0; i < this.blocks.length; i++) {
        if (!this.blocks[i].allocated && this.blocks[i].size >= requestSize) {
          if (this.blocks[i].size > worstSize) {
            worstSize = this.blocks[i].size;
            targetIdx = i;
          }
        }
      }
    }

    if (targetIdx === -1) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `${strategy === "firstFit" ? "首次适应" : strategy === "bestFit" ? "最佳适应" : "最坏适应"}: 分配 ${reqName}(${requestSize}) 失败`,
        description: `请求 ${reqName} 大小=${requestSize}，无合适空闲块可分配`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    const target = this.blocks[targetIdx];

    if (target.size === requestSize) {
      // Exact fit
      target.allocated = true;
      target.processName = reqName;

      recorder.record({
        type: "FILL_CELL",
        title: `${strategy === "firstFit" ? "首次适应" : strategy === "bestFit" ? "最佳适应" : "最坏适应"}: 分配 ${reqName}(${requestSize})`,
        description: `精确匹配！将块${targetIdx}（大小=${target.size}）分配给 ${reqName}`,
        codeLine: line,
        targets: [target.id],
      });
    } else {
      // Split block
      const remainingSize = target.size - requestSize;

      // Update target block to be allocated
      target.size = requestSize;
      target.allocated = true;
      target.processName = reqName;

      // Insert new free block after target
      const newBlock: MemoryBlock = {
        id: this.nextId(),
        startAddr: target.startAddr + requestSize,
        size: remainingSize,
        allocated: false,
        processName: "",
      };
      this.blocks.splice(targetIdx + 1, 0, newBlock);

      recorder.record({
        type: "FILL_CELL",
        title: `${strategy === "firstFit" ? "首次适应" : strategy === "bestFit" ? "最佳适应" : "最坏适应"}: 分配 ${reqName}(${requestSize})`,
        description: `在块${targetIdx}中分配 ${requestSize}，剩余 ${remainingSize} 形成新空闲块`,
        codeLine: line,
        targets: [target.id],
      });
    }
  }

  private doFirstFit(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.totalSize = Number(args[0]);
    this.blocks = [{
      id: this.nextId(),
      startAddr: 0,
      size: this.totalSize,
      allocated: false,
      processName: "",
    }];
    this.requestCounter = 0;

    const requests = args.slice(1).map(Number);
    for (const reqSize of requests) {
      this.allocate(reqSize, "firstFit", recorder, line);
    }
  }

  private doBestFit(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.totalSize = Number(args[0]);
    this.blocks = [{
      id: this.nextId(),
      startAddr: 0,
      size: this.totalSize,
      allocated: false,
      processName: "",
    }];
    this.requestCounter = 0;

    const requests = args.slice(1).map(Number);
    for (const reqSize of requests) {
      this.allocate(reqSize, "bestFit", recorder, line);
    }
  }

  private doWorstFit(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.totalSize = Number(args[0]);
    this.blocks = [{
      id: this.nextId(),
      startAddr: 0,
      size: this.totalSize,
      allocated: false,
      processName: "",
    }];
    this.requestCounter = 0;

    const requests = args.slice(1).map(Number);
    for (const reqSize of requests) {
      this.allocate(reqSize, "worstFit", recorder, line);
    }
  }
}
