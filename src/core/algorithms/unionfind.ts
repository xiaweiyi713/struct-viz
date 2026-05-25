import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class UnionFindRuntime implements StructureRuntime {
  private parent: number[] = [];
  private rank: number[] = [];
  private size = 0;
  private statuses: string[] = [];
  private unionCount = 0;
  private findCount = 0;

  private buildItems(): VisualArrayItem[] {
    return this.parent.map((p, i) => ({
      id: `uf-${i}`,
      value: p,
      status: this.statuses[i] as VisualArrayItem["status"],
    }));
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    switch (method) {
      case "init":
        this.doInit(Number(args[0]), recorder, line);
        break;
      case "union":
        this.doUnion(Number(args[0]), Number(args[1]), recorder, line);
        break;
      case "find":
        this.doFind(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`UnionFind 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return { type: "array", items: this.buildItems(), label: "UnionFind" };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      size: { type: "number", value: this.size, display: `${this.size}` },
      unions: { type: "number", value: this.unionCount, display: `${this.unionCount}` },
      finds: { type: "number", value: this.findCount, display: `${this.findCount}` },
    };
  }

  private doInit(n: number, recorder: TraceRecorder, line: number): void {
    this.size = n;
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.statuses = new Array(n).fill("default");
    this.unionCount = 0;
    this.findCount = 0;

    recorder.record({
      type: "VISIT_NODE",
      title: "初始化并查集",
      description: `共 ${n} 个元素，每个元素初始时自成一个集合（parent[i] = i）`,
      codeLine: line,
      targets: [],
    });
  }

  private findRoot(x: number): number {
    while (this.parent[x] !== x) {
      // 路径压缩：将 x 的父节点设为祖父节点
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }

  private doFind(x: number, recorder: TraceRecorder, line: number): void {
    if (x < 0 || x >= this.size) throw new Error(`元素 ${x} 超出范围`);
    this.findCount++;

    this.statuses = new Array(this.size).fill("default");
    this.statuses[x] = "active";

    recorder.record({
      type: "FIND",
      title: `查找元素 ${x} 的根`,
      description: `开始查找，从元素 ${x} 沿 parent 数组向上追溯`,
      codeLine: line,
      targets: [`uf-${x}`],
    });

    let cur = x;
    while (this.parent[cur] !== cur) {
      this.statuses[cur] = "active";
      const next = this.parent[cur];
      this.statuses[next] = "highlighted";

      recorder.record({
        type: "FIND",
        title: `parent[${cur}] = ${next}，继续向上`,
        description: `元素 ${cur} 的父节点是 ${next}`,
        codeLine: line,
        targets: [`uf-${cur}`, `uf-${next}`],
      });

      cur = next;
    }

    this.statuses = new Array(this.size).fill("default");
    this.statuses[cur] = "highlighted";

    recorder.record({
      type: "MARK_FINAL",
      title: `元素 ${x} 的根是 ${cur}`,
      description: `查找完成，元素 ${x} 属于以 ${cur} 为根的集合`,
      codeLine: line,
      targets: [`uf-${cur}`],
      payload: { element: x, root: cur },
    });

    // 执行路径压缩
    const root = this.findRoot(x);
    if (root !== this.parent[x]) {
      this.parent[x] = root;
      recorder.record({
        type: "VISIT_NODE",
        title: `路径压缩: parent[${x}] = ${root}`,
        description: `将元素 ${x} 直接指向根 ${root}，加速后续查找`,
        codeLine: line,
        targets: [`uf-${x}`],
      });
    }
  }

  private doUnion(a: number, b: number, recorder: TraceRecorder, line: number): void {
    if (a < 0 || a >= this.size || b < 0 || b >= this.size)
      throw new Error(`元素超出范围`);

    this.unionCount++;
    this.statuses = new Array(this.size).fill("default");
    this.statuses[a] = "active";
    this.statuses[b] = "active";

    recorder.record({
      type: "UNION",
      title: `合并元素 ${a} 和 ${b}`,
      description: `查找各自的根，按秩合并`,
      codeLine: line,
      targets: [`uf-${a}`, `uf-${b}`],
    });

    const rootA = this.findRoot(a);
    const rootB = this.findRoot(b);

    if (rootA === rootB) {
      this.statuses = new Array(this.size).fill("default");
      this.statuses[rootA] = "highlighted";

      recorder.record({
        type: "VISIT_NODE",
        title: `元素 ${a} 和 ${b} 已在同一集合`,
        description: `根都是 ${rootA}，无需合并`,
        codeLine: line,
        targets: [`uf-${rootA}`],
      });
      return;
    }

    // 按秩合并
    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }

    this.statuses = new Array(this.size).fill("default");
    this.statuses[rootA] = "highlighted";
    this.statuses[rootB] = "highlighted";

    recorder.record({
      type: "MARK_FINAL",
      title: `合并完成: 根 ${rootA} 和根 ${rootB} 已合并`,
      description: `按秩合并后的 parent 数组: [${this.parent.join(", ")}]`,
      codeLine: line,
      targets: [`uf-${rootA}`, `uf-${rootB}`],
    });
  }
}
