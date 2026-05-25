import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── CacheFullyAssocRuntime ──

interface CacheLine {
  valid: boolean;
  tag: number;
  block: number;
  lruCounter: number;
}

export class CacheFullyAssocRuntime implements StructureRuntime {
  private rows = 0;
  private cols = 3;
  private cells: VisualMatrixCell[] = [];
  private rowHeaders: string[] = [];
  private colHeaders: string[] = ["标记(Tag)", "数据(块号)", "有效位"];
  private cacheLines: CacheLine[] = [];
  private lastOp = "";
  private lruClock = 0;

  private makeCell(id: string, row: number, col: number, value: number | string, status: VisualMatrixCell["status"] = "default"): VisualMatrixCell {
    return { id, row, col, value, status };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "access":
        this.doAccess(
          Number(args[0]),
          Number(args[1]),
          args.slice(2).map(Number),
          recorder,
          line,
        );
        break;
      default:
        throw new Error(`CacheFullyAssoc 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "matrix",
      rows: this.rows,
      cols: this.cols,
      cells: this.cells,
      rowHeaders: this.rowHeaders,
      colHeaders: this.colHeaders,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      operation: { type: "string", value: this.lastOp, display: this.lastOp || "无" },
    };
  }

  // ── 初始化 ──

  private initCache(lineCount: number): void {
    this.cacheLines = [];
    this.cells = [];
    this.rowHeaders = [];
    this.lruClock = 0;

    for (let i = 0; i < lineCount; i++) {
      this.cacheLines.push({ valid: false, tag: -1, block: -1, lruCounter: 0 });
      this.rowHeaders.push(`行${i}`);
      this.cells.push(this.makeCell(`r${i}-0`, i, 0, "-", "default"));
      this.cells.push(this.makeCell(`r${i}-1`, i, 1, "-", "default"));
      this.cells.push(this.makeCell(`r${i}-2`, i, 2, 0, "default"));
    }

    this.rows = lineCount;
  }

  private updateRow(idx: number): void {
    const cl = this.cacheLines[idx];
    this.cells = this.cells.map(c => {
      if (c.row === idx && c.col === 0) return { ...c, value: cl.valid ? cl.tag : "-" };
      if (c.row === idx && c.col === 1) return { ...c, value: cl.valid ? cl.block : "-" };
      if (c.row === idx && c.col === 2) return { ...c, value: cl.valid ? 1 : 0 };
      return c;
    });
  }

  private highlightRow(idx: number, status: VisualMatrixCell["status"]): void {
    this.cells = this.cells.map(c => {
      if (c.row === idx) return { ...c, status };
      return { ...c, status: "default" as const };
    });
  }

  // ── 全相联访问 ──

  private doAccess(cacheSize: number, blockSize: number, addresses: number[], recorder: TraceRecorder, line: number): void {
    this.lastOp = `全相联 Cache (${cacheSize}行, 块大小${blockSize}B)`;
    this.initCache(cacheSize);
    let hits = 0;
    let misses = 0;

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "初始化全相联 Cache",
      description: `Cache ${cacheSize} 行，块大小 ${blockSize} 字节。全相联映射: 主存块可放入任意 Cache 行，采用 LRU 替换策略`,
      codeLine: line,
    });

    for (const addr of addresses) {
      const blockNumber = Math.floor(addr / blockSize);
      const tag = blockNumber;

      // 在所有行中查找
      let hitLine = -1;
      for (let i = 0; i < cacheSize; i++) {
        if (this.cacheLines[i].valid && this.cacheLines[i].tag === tag) {
          hitLine = i;
          break;
        }
      }

      if (hitLine >= 0) {
        // 命中
        hits++;
        this.lruClock++;
        this.cacheLines[hitLine].lruCounter = this.lruClock;
        this.highlightRow(hitLine, "computed");

        recorder.record({
          type: "FILL_CELL",
          title: `命中！地址 ${addr} → 块 ${blockNumber}（行${hitLine}）`,
          description: `Tag=${tag} 在 Cache 行${hitLine}找到`,
          codeLine: line,
        });
      } else {
        // 缺失
        misses++;
        this.lruClock++;

        // 找空行或 LRU 替换
        let targetLine = -1;
        for (let i = 0; i < cacheSize; i++) {
          if (!this.cacheLines[i].valid) {
            targetLine = i;
            break;
          }
        }

        if (targetLine === -1) {
          // LRU 替换
          let minLRU = Infinity;
          for (let i = 0; i < cacheSize; i++) {
            if (this.cacheLines[i].lruCounter < minLRU) {
              minLRU = this.cacheLines[i].lruCounter;
              targetLine = i;
            }
          }
        }

        const cl = this.cacheLines[targetLine];
        const oldInfo = cl.valid ? `（替换块 ${cl.block}，Tag=${cl.tag}）` : "（空行）";
        cl.valid = true;
        cl.tag = tag;
        cl.block = blockNumber;
        cl.lruCounter = this.lruClock;
        this.updateRow(targetLine);
        this.highlightRow(targetLine, "highlighted");

        recorder.record({
          type: "FILL_CELL",
          title: `缺失！地址 ${addr} → 块 ${blockNumber} → 行${targetLine}`,
          description: `Tag=${tag} 不在 Cache。${oldInfo}。加载到行${targetLine}`,
          codeLine: line,
        });
      }

      this.highlightRow(hitLine >= 0 ? hitLine : 0, "default");
    }

    const total = hits + misses;
    recorder.record({
      type: "CHECK_INVARIANT",
      title: "访问序列完成",
      description: `共 ${total} 次访问，命中 ${hits} 次，缺失 ${misses} 次，命中率: ${total > 0 ? ((hits / total) * 100).toFixed(1) : 0}%`,
      codeLine: line,
    });
  }
}
