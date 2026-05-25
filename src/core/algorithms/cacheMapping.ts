import type {
  Literal,
  VisualStructure,
  VisualMatrixCell,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── CacheMappingRuntime ──

interface CacheLine {
  valid: boolean;
  tag: number;
  block: number;
}

export class CacheMappingRuntime implements StructureRuntime {
  private rows = 0;
  private cols = 3; // 块号、标记(tag)、有效位
  private cells: VisualMatrixCell[] = [];
  private rowHeaders: string[] = [];
  private colHeaders: string[] = ["块号", "标记(Tag)", "有效位"];
  private cacheLines: CacheLine[] = [];
  private lastOp = "";
  private mode: "direct" | "setAssoc" = "direct";

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
      case "direct":
        this.doDirect(Number(args[0]), Number(args[1]), args.slice(2).map(Number), recorder, line);
        break;
      case "setAssoc":
        this.doSetAssoc(Number(args[0]), Number(args[1]), Number(args[2]), args.slice(3).map(Number), recorder, line);
        break;
      default:
        throw new Error(`CacheMapping 不支持方法 "${method}"`);
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
      mode: { type: "string", value: this.mode, display: this.mode },
    };
  }

  // ── 初始化 Cache 矩阵 ──

  private initCacheMatrix(lineCount: number): void {
    this.cacheLines = [];
    this.cells = [];
    this.rowHeaders = [];

    for (let i = 0; i < lineCount; i++) {
      this.cacheLines.push({ valid: false, tag: -1, block: -1 });
      this.rowHeaders.push(`Cache行${i}`);
      this.cells.push(this.makeCell(`r${i}-0`, i, 0, "-", "default"));
      this.cells.push(this.makeCell(`r${i}-1`, i, 1, "-", "default"));
      this.cells.push(this.makeCell(`r${i}-2`, i, 2, 0, "default"));
    }

    this.rows = lineCount;
  }

  private updateCacheRow(lineIndex: number): void {
    const cl = this.cacheLines[lineIndex];
    this.cells = this.cells.map(c => {
      if (c.row === lineIndex && c.col === 0) return { ...c, value: cl.valid ? cl.block : "-" };
      if (c.row === lineIndex && c.col === 1) return { ...c, value: cl.valid ? cl.tag : "-" };
      if (c.row === lineIndex && c.col === 2) return { ...c, value: cl.valid ? 1 : 0 };
      return c;
    });
  }

  private highlightRow(lineIndex: number, status: VisualMatrixCell["status"]): void {
    this.cells = this.cells.map(c => {
      if (c.row === lineIndex) return { ...c, status };
      return { ...c, status: "default" as const };
    });
  }

  // ── 直接映射 ──

  private doDirect(cacheLines: number, mainBlocks: number, accesses: number[], recorder: TraceRecorder, line: number): void {
    this.lastOp = "直接映射";
    this.mode = "direct";
    this.colHeaders = ["块号", "标记(Tag)", "有效位"];

    this.initCacheMatrix(cacheLines);

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "初始化 Cache",
      description: `Cache ${cacheLines} 行，主存 ${mainBlocks} 块。直接映射: 主存块号 % ${cacheLines} = Cache 行号`,
      codeLine: line,
    });

    for (const block of accesses) {
      const lineIdx = block % cacheLines;
      const tag = Math.floor(block / cacheLines);
      const cl = this.cacheLines[lineIdx];

      // 高亮目标行
      this.highlightRow(lineIdx, "active");
      recorder.record({
        type: "COMPARE",
        title: `访问主存块 ${block}`,
        description: `映射到 Cache 行 ${lineIdx}（${block} mod ${cacheLines}），Tag = ${tag}`,
        codeLine: line,
      });

      // 判断命中/缺失
      if (cl.valid && cl.block === block) {
        this.highlightRow(lineIdx, "computed");
        recorder.record({
          type: "FILL_CELL",
          title: `命中！块 ${block} 在 Cache 行 ${lineIdx}`,
          description: `Cache 行 ${lineIdx} 已有块 ${block}（Tag=${cl.tag}），命中`,
          codeLine: line,
        });
      } else {
        // 缺失，加载
        const oldInfo = cl.valid ? `（原块 ${cl.block}，Tag=${cl.tag}）被替换` : "（空行）";
        cl.valid = true;
        cl.block = block;
        cl.tag = tag;
        this.updateCacheRow(lineIdx);
        this.highlightRow(lineIdx, "highlighted");

        recorder.record({
          type: "FILL_CELL",
          title: `缺失！加载块 ${block} → Cache 行 ${lineIdx}`,
          description: `块 ${block} 不在 Cache 行 ${lineIdx}。${oldInfo}。新 Tag=${tag}`,
          codeLine: line,
        });
      }

      // 恢复状态
      this.highlightRow(lineIdx, "default");
    }
  }

  // ── 组相联映射 ──

  private doSetAssoc(ways: number, sets: number, mainBlocks: number, accesses: number[], recorder: TraceRecorder, line: number): void {
    this.lastOp = `${ways}路组相联`;
    this.mode = "setAssoc";
    this.colHeaders = ["块号", "标记(Tag)", "有效位"];

    const totalLines = ways * sets;
    this.initCacheMatrix(totalLines);

    // LRU 计数器
    const lruCounters: number[][] = [];
    for (let s = 0; s < sets; s++) {
      lruCounters.push(new Array(ways).fill(0));
    }

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "初始化 Cache",
      description: `${ways} 路组相联，${sets} 组，共 ${totalLines} 行，主存 ${mainBlocks} 块。组号 = 主存块号 % ${sets}`,
      codeLine: line,
    });

    for (const block of accesses) {
      const setIdx = block % sets;
      const tag = Math.floor(block / sets);
      const setStart = setIdx * ways;

      // 检查组内是否命中
      let hit = false;
      let hitWay = -1;

      for (let w = 0; w < ways; w++) {
        const idx = setStart + w;
        const cl = this.cacheLines[idx];
        if (cl.valid && cl.block === block) {
          hit = true;
          hitWay = w;
          break;
        }
      }

      // 高亮整组
      for (let w = 0; w < ways; w++) {
        this.highlightRow(setStart + w, "active");
      }
      recorder.record({
        type: "COMPARE",
        title: `访问主存块 ${block}`,
        description: `映射到组 ${setIdx}（${block} mod ${sets}），Tag = ${tag}。检查组内 ${ways} 路`,
        codeLine: line,
      });

      if (hit) {
        // 更新 LRU
        const maxLRU = Math.max(...lruCounters[setIdx]);
        lruCounters[setIdx][hitWay] = maxLRU + 1;

        const hitIdx = setStart + hitWay;
        this.highlightRow(hitIdx, "computed");
        recorder.record({
          type: "FILL_CELL",
          title: `命中！块 ${block} 在组 ${setIdx} 第 ${hitWay} 路`,
          description: `Cache 行 ${hitIdx} 已有块 ${block}（Tag=${this.cacheLines[hitIdx].tag}），命中`,
          codeLine: line,
        });
      } else {
        // 找空行或 LRU 替换
        let targetWay = -1;
        for (let w = 0; w < ways; w++) {
          if (!this.cacheLines[setStart + w].valid) {
            targetWay = w;
            break;
          }
        }

        if (targetWay === -1) {
          // LRU 替换
          const minLRU = Math.min(...lruCounters[setIdx]);
          targetWay = lruCounters[setIdx].indexOf(minLRU);
        }

        const targetIdx = setStart + targetWay;
        const cl = this.cacheLines[targetIdx];
        const oldInfo = cl.valid ? `（替换块 ${cl.block}）` : "（空行）";

        cl.valid = true;
        cl.block = block;
        cl.tag = tag;
        this.updateCacheRow(targetIdx);

        // 更新 LRU
        const maxLRU = Math.max(...lruCounters[setIdx]);
        lruCounters[setIdx][targetWay] = maxLRU + 1;

        this.highlightRow(targetIdx, "highlighted");
        recorder.record({
          type: "FILL_CELL",
          title: `缺失！加载块 ${block} → 组 ${setIdx} 第 ${targetWay} 路`,
          description: `块 ${block} 不在组 ${setIdx}。${oldInfo}。新 Tag=${tag}`,
          codeLine: line,
        });
      }

      // 恢复状态
      for (let w = 0; w < ways; w++) {
        this.highlightRow(setStart + w, "default");
      }
    }
  }
}
