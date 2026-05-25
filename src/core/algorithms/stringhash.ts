import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

const BASE = 131;
const MOD = 1_000_000_007;

export class StringHashRuntime implements StructureRuntime {
  private str = "";
  private prefixHash: number[] = [];
  private power: number[] = [];
  private prefixStatuses: string[] = [];
  private powerStatuses: string[] = [];
  private queryResults: number[] = [];
  private queryStatuses: string[] = [];

  private makeItems(arr: (number | string)[], statuses: string[], prefix: string): VisualArrayItem[] {
    return arr.map((v, i) => ({
      id: `${prefix}-${i}`,
      value: v,
      status: statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    if (method !== "hash") throw new Error(`StringHash 不支持方法 "${method}"`);
    this.doHash(String(args[0]), args.slice(1).map((a) => Number(a)), recorder, line);
  }

  getSnapshot(): VisualStructure {
    const arrays: VisualArrayItem[][] = [
      this.makeItems(this.str.split(""), this.str.split("").map(() => "default"), "ch"),
      this.makeItems(this.prefixHash, this.prefixStatuses, "h"),
      this.makeItems(this.power, this.powerStatuses, "p"),
    ];
    const labels = ["字符", "前缀哈希 H", "幂次 P"];

    if (this.queryResults.length > 0) {
      arrays.push(this.makeItems(this.queryResults, this.queryStatuses, "q"));
      labels.push("查询结果");
    }

    return { type: "multiarray", arrays, labels };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      str: { type: "string", value: this.str, display: `"${this.str}"` },
      base: { type: "number", value: BASE, display: `${BASE}` },
      mod: { type: "number", value: MOD, display: `${MOD}` },
      length: { type: "number", value: this.str.length, display: `${this.str.length}` },
    };
  }

  private doHash(str: string, queries: number[], recorder: TraceRecorder, line: number): void {
    if (str.length === 0) {
      recorder.record({
        type: "VISIT_NODE",
        title: "字符串哈希：字符串为空",
        description: "没有数据",
        codeLine: line,
        targets: [],
      });
      return;
    }

    this.str = str;
    const n = str.length;

    this.prefixHash = new Array(n + 1).fill(0);
    this.power = new Array(n + 1).fill(1);
    this.prefixStatuses = new Array(n + 1).fill("default");
    this.powerStatuses = new Array(n + 1).fill("default");
    this.queryResults = [];
    this.queryStatuses = [];

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化字符串哈希",
      description: `字符串: "${str}"，长度 ${n}，基数 ${BASE}，模数 ${MOD}`,
      codeLine: line,
      targets: [],
    });

    // 计算幂次数组
    for (let i = 1; i <= n; i++) {
      this.power[i] = (this.power[i - 1] * BASE) % MOD;
      this.powerStatuses[i] = "active";

      recorder.record({
        type: "FILL_CELL",
        title: `计算 P[${i}]`,
        description: `P[${i}] = P[${i - 1}] × ${BASE} mod ${MOD} = ${this.power[i]}`,
        codeLine: line,
        targets: [`p-${i}`],
      });

      this.powerStatuses[i] = "default";
    }

    // 计算前缀哈希
    for (let i = 1; i <= n; i++) {
      const charCode = str.charCodeAt(i - 1);
      this.prefixHash[i] = (this.prefixHash[i - 1] * BASE + charCode) % MOD;
      this.prefixStatuses[i] = "active";
      this.prefixStatuses[i - 1] = "active";

      recorder.record({
        type: "FILL_CELL",
        title: `计算 H[${i}]`,
        description: `H[${i}] = (H[${i - 1}] × ${BASE} + '${str[i - 1]}'(${charCode})) mod ${MOD} = ${this.prefixHash[i]}`,
        codeLine: line,
        targets: [`h-${i}`, `ch-${i - 1}`],
      });

      this.prefixStatuses[i] = "computed";
      this.prefixStatuses[i - 1] = "default";
    }

    this.prefixStatuses[0] = "computed";

    recorder.record({
      type: "VISIT_NODE",
      title: "前缀哈希计算完成",
      description: `H = [${this.prefixHash.join(", ")}]，P = [${this.power.join(", ")}]`,
      codeLine: line,
      targets: [],
    });

    // 处理子串查询 (l, r) 对
    for (let q = 0; q + 1 < queries.length; q += 2) {
      const l = queries[q];
      const r = queries[q + 1];
      if (l < 1 || r > n || l > r) {
        this.queryResults.push("无效");
        this.queryStatuses.push("default");
        continue;
      }

      const hash = ((this.prefixHash[r] - this.prefixHash[l - 1] * this.power[r - l + 1]) % MOD + MOD) % MOD;
      this.queryResults.push(hash);
      this.queryStatuses.push("highlighted");

      for (let i = l; i <= r; i++) this.prefixStatuses[i] = "highlighted";

      recorder.record({
        type: "FILL_CELL",
        title: `查询子串 [${l}, ${r}]`,
        description: `"${str.slice(l - 1, r)}" 的哈希值 = H[${r}] - H[${l - 1}] × P[${r - l + 1}] = ${hash}`,
        codeLine: line,
        targets: [`h-${l - 1}`, `h-${r}`, `q-${q / 2}`],
      });

      for (let i = l; i <= r; i++) this.prefixStatuses[i] = "computed";
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "字符串哈希完成",
      description: `前缀哈希: [${this.prefixHash.join(", ")}]${this.queryResults.length > 0 ? `，查询结果: [${this.queryResults.join(", ")}]` : ""}`,
      codeLine: line,
      targets: [],
    });
  }
}
