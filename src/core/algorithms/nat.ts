import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── NATRuntime ──

interface NATEntry {
  privateIp: string;
  privatePort: number;
  publicIp: string;
  publicPort: number;
  protocol: string;
}

export class NATRuntime implements StructureRuntime {
  private arrays: VisualArrayItem[][] = [];
  private labels: string[] = [];
  private lastOp = "";
  private table: NATEntry[] = [];
  private idCounter = 0;

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
        this.doTranslate(args.map(String), recorder, line);
        break;
      default:
        throw new Error(`NAT 不支持方法 "${method}"`);
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
      entries: { type: "number", value: this.table.length, display: `${this.table.length}` },
    };
  }

  // ── NAT 转换 ──

  private doTranslate(entries: string[], recorder: TraceRecorder, line: number): void {
    this.lastOp = `NAT 转换 (${entries.length / 2} 条)`;
    this.arrays = [];
    this.labels = [];
    this.table = [];
    this.idCounter = 0;

    const publicIp = "203.0.113.1";
    let nextPublicPort = 5000;

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "NAT 转换表初始化",
      description: `公网 IP: ${publicIp}，将私有地址映射为公有地址+端口`,
      codeLine: line,
    });

    // 解析每对 (privateIp, port) 参数
    for (let i = 0; i < entries.length; i += 2) {
      const privateIp = entries[i];
      const port = Number(entries[i + 1]);

      this.idCounter++;
      const publicPort = nextPublicPort++;
      const entry: NATEntry = {
        privateIp,
        privatePort: port,
        publicIp,
        publicPort,
        protocol: "TCP",
      };
      this.table.push(entry);

      recorder.record({
        type: "FILL_CELL",
        title: `映射 #${this.idCounter}: ${privateIp}:${port} → ${publicIp}:${publicPort}`,
        description: `私有地址 ${privateIp}:${port} 映射为公网地址 ${publicIp}:${publicPort}`,
        codeLine: line,
      });

      // 展示当前映射表
      const tableItems: VisualArrayItem[] = [];
      for (let r = 0; r < this.table.length; r++) {
        const e = this.table[r];
        const isNew = r === this.table.length - 1;
        tableItems.push(this.makeItem(`nat-${this.idCounter}-${r}-priv`, `${e.privateIp}:${e.privatePort}`, isNew ? "highlighted" : "default"));
        tableItems.push(this.makeItem(`nat-${this.idCounter}-${r}-pub`, `${e.publicIp}:${e.publicPort}`, isNew ? "highlighted" : "default"));
      }
      this.arrays.push(tableItems);
      this.labels.push(`映射表（#${this.idCounter} 新增高亮）`);
    }

    // 最终展示完整映射表
    const finalItems: VisualArrayItem[] = [];
    for (const e of this.table) {
      finalItems.push(this.makeItem(`fin-priv-${e.privatePort}`, `${e.privateIp}:${e.privatePort}`, "default"));
      finalItems.push(this.makeItem(`fin-pub-${e.publicPort}`, `${e.publicIp}:${e.publicPort}`, "default"));
    }
    this.arrays.push(finalItems);
    this.labels.push(`最终 NAT 映射表（${this.table.length} 条）`);

    recorder.record({
      type: "MARK_FINAL",
      title: "NAT 转换完成",
      description: `共 ${this.table.length} 条映射。NAPT（网络地址端口转换），多个私有地址共享一个公网 IP，通过端口号区分`,
      codeLine: line,
      payload: {
        table: this.table.map(e => ({
          private: `${e.privateIp}:${e.privatePort}`,
          public: `${e.publicIp}:${e.publicPort}`,
        })),
      },
    });
  }
}
