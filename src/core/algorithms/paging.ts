import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class PagingRuntime implements StructureRuntime {
  private pageSize = 0;
  private pageTable: number[] = [];
  private lastResult: {
    logicalAddr: number;
    pageNum: number;
    offset: number;
    frameNum: number;
    physicalAddr: number;
    binary: string;
  } | null = null;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `pg-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    const resultItems: VisualArrayItem[] = [];

    if (this.lastResult) {
      const r = this.lastResult;
      resultItems.push(
        {
          id: this.nextId(),
          value: `逻辑地址:${r.logicalAddr}`,
          status: "default",
        },
        {
          id: this.nextId(),
          value: `二进制:${r.binary}`,
          status: "default",
        },
        {
          id: this.nextId(),
          value: `页号:${r.pageNum}`,
          status: "highlighted",
        },
        {
          id: this.nextId(),
          value: `页内偏移:${r.offset}`,
          status: "highlighted",
        },
        {
          id: this.nextId(),
          value: `页框号:${r.frameNum}`,
          status: "active",
        },
        {
          id: this.nextId(),
          value: `物理地址:${r.physicalAddr}`,
          status: "active",
        },
      );
    }

    // Page table array
    const ptItems: VisualArrayItem[] = this.pageTable.map((frame, page) => ({
      id: this.nextId(),
      value: `页${page}→框${frame}`,
      status:
        this.lastResult && page === this.lastResult.pageNum
          ? ("highlighted" as const)
          : ("default" as const),
    }));

    return {
      type: "multiarray",
      arrays: [resultItems, ptItems],
      labels: ["地址转换结果", "页表"],
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "translate":
        this.doTranslate(args, recorder, line);
        break;
      default:
        throw new Error(`Paging 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    const vars: Record<string, RuntimeValue> = {
      页大小: {
        type: "number",
        value: this.pageSize,
        display: `${this.pageSize}`,
      },
      页表项数: {
        type: "number",
        value: this.pageTable.length,
        display: `${this.pageTable.length}`,
      },
    };

    if (this.lastResult) {
      vars["逻辑地址"] = {
        type: "number",
        value: this.lastResult.logicalAddr,
        display: `${this.lastResult.logicalAddr}`,
      };
      vars["页号"] = {
        type: "number",
        value: this.lastResult.pageNum,
        display: `${this.lastResult.pageNum}`,
      };
      vars["页内偏移"] = {
        type: "number",
        value: this.lastResult.offset,
        display: `${this.lastResult.offset}`,
      };
      vars["物理地址"] = {
        type: "number",
        value: this.lastResult.physicalAddr,
        display: `${this.lastResult.physicalAddr}`,
      };
    }

    return vars;
  }

  private doTranslate(args: Literal[], recorder: TraceRecorder, line: number): void {
    const logicalAddr = Number(args[0]);
    this.pageSize = Number(args[1]);
    this.pageTable = args.slice(2).map(Number);

    // Calculate page number and offset
    const pageNum = Math.floor(logicalAddr / this.pageSize);
    const offset = logicalAddr % this.pageSize;

    // Calculate binary representation
    const binary = logicalAddr.toString(2);

    // Look up page table
    if (pageNum >= this.pageTable.length) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `分页: 地址转换失败`,
        description: `逻辑地址 ${logicalAddr} 对应页号 ${pageNum}，超出页表范围（共 ${this.pageTable.length} 页）`,
        codeLine: line,
        targets: [],
      });
      this.lastResult = {
        logicalAddr,
        pageNum,
        offset,
        frameNum: -1,
        physicalAddr: -1,
        binary,
      };
      return;
    }

    const frameNum = this.pageTable[pageNum];
    const physicalAddr = frameNum * this.pageSize + offset;

    this.lastResult = {
      logicalAddr,
      pageNum,
      offset,
      frameNum,
      physicalAddr,
      binary,
    };

    recorder.record({
      type: "FILL_CELL",
      title: `分页: 转换地址 ${logicalAddr} → ${physicalAddr}`,
      description: `逻辑地址 ${logicalAddr}（二进制: ${binary}）→ 页号=${pageNum}，页内偏移=${offset} → 查页表: 页${pageNum}→框${frameNum} → 物理地址=${frameNum}×${this.pageSize}+${offset}=${physicalAddr}`,
      codeLine: line,
      targets: [`page-${pageNum}`],
    });
  }
}
