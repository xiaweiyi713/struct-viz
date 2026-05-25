import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── VirtualAddressRuntime ──

interface PageTableEntry {
  frame: number;
  valid: boolean;
}

export class VirtualAddressRuntime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [];
  private labels: string[] = [];
  private lastOp = "";
  private entries: PageTableEntry[] = [];

  private makeItem(id: string, value: number | string, status: VisualArrayItem["status"] = "default"): VisualArrayItem {
    return { id, value, status };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "translate":
        this.doTranslate(
          Number(args[0]),
          Number(args[1]),
          args.slice(2).map(Number),
          recorder,
          line,
        );
        break;
      default:
        throw new Error(`VirtualAddress 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "multiarray",
      arrays: this.arrays,
      labels: this.labels,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      operation: { type: "string", value: this.lastOp, display: this.lastOp || "无" },
    };
  }

  // ── 虚拟地址转换 ──

  private doTranslate(
    virtualAddr: number,
    pageSize: number,
    pageTableArgs: number[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    this.lastOp = `虚拟地址转换 VA=${virtualAddr}`;
    this.arrays = [];
    this.labels = [];
    this.entries = [];

    // 解析页表条目：每两个参数为一组 [frame, valid]
    for (let i = 0; i < pageTableArgs.length; i += 2) {
      this.entries.push({
        frame: pageTableArgs[i],
        valid: pageTableArgs[i + 1] !== 0,
      });
    }

    const offsetBits = Math.ceil(Math.log2(pageSize));
    const pageMask = pageSize - 1;
    const virtualPage = Math.floor(virtualAddr / pageSize);
    const offset = virtualAddr & pageMask;

    // 步骤 1：分解虚拟地址
    recorder.record({
      type: "CHECK_INVARIANT",
      title: `分解虚拟地址 ${virtualAddr}`,
      description: `虚拟地址 ${virtualAddr} = 页号 ${virtualPage} × 页大小 ${pageSize} + 页内偏移 ${offset}。页大小 ${pageSize}B，偏移位数 ${offsetBits}`,
      codeLine: line,
      targets: [],
    });

    this.arrays.push([
      this.makeItem("va-page", virtualPage, "highlighted"),
      this.makeItem("va-offset", offset, "active"),
    ]);
    this.labels.push(`虚拟地址 ${virtualAddr}: [页号=${virtualPage}, 偏移=${offset}]`);

    // 步骤 2：页表查找
    if (virtualPage >= this.entries.length) {
      recorder.record({
        type: "COMPARE",
        title: `页号 ${virtualPage} 超出页表范围`,
        description: `页表只有 ${this.entries.length} 项（0~${this.entries.length - 1}），虚拟页号 ${virtualPage} 超出范围`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    const entry = this.entries[virtualPage];

    // 展示页表
    const ptItems: VisualArrayItem[] = [];
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      const status = i === virtualPage ? "active" as const : "default" as const;
      ptItems.push(this.makeItem(`pt-${i}-f`, e.valid ? `F${e.frame}` : "×", status));
    }
    this.arrays.push(ptItems);
    this.labels.push(`页表（第${virtualPage}项被查询）`);

    recorder.record({
      type: "FIND",
      title: `查找页表项 ${virtualPage}`,
      description: `页表项[${virtualPage}]: 有效位=${entry.valid ? 1 : 0}${entry.valid ? `，物理页框=${entry.frame}` : ""}`,
      codeLine: line,
      targets: [],
    });

    if (!entry.valid) {
      recorder.record({
        type: "COMPARE",
        title: `缺页！虚拟页 ${virtualPage} 不在内存`,
        description: `页表项[${virtualPage}] 有效位为 0，触发缺页中断，需要从磁盘调入`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    // 步骤 3：拼接物理地址
    const physicalAddr = entry.frame * pageSize + offset;

    this.arrays.push([
      this.makeItem("pa-frame", entry.frame, "highlighted"),
      this.makeItem("pa-offset", offset, "active"),
    ]);
    this.labels.push(`物理地址 ${physicalAddr}: [页框=${entry.frame}, 偏移=${offset}]`);

    recorder.record({
      type: "MARK_FINAL",
      title: `物理地址 = ${physicalAddr}`,
      description: `虚拟地址 ${virtualAddr} → 物理地址 ${physicalAddr}。虚拟页 ${virtualPage} → 物理页框 ${entry.frame}，偏移 ${offset} 不变`,
      codeLine: line,
      targets: [],
      payload: { virtualAddr, physicalAddr, virtualPage, frame: entry.frame, offset },
    });
  }
}
