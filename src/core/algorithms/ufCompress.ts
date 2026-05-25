import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── UFCompressRuntime ──

interface UFNode {
  id: string;
  value: number;
}

export class UFCompressRuntime implements StructureRuntime {
  private parent: Map<string, string> = new Map();
  private nodes: Map<string, UFNode> = new Map();
  private size = 0;
  private idCounter = 0;
  private rootId: string | null = null;

  private nextId(): string {
    this.idCounter += 1;
    return `ufc-${this.idCounter}`;
  }

  private getNode(id: string): UFNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`节点 ${id} 不存在`);
    return node;
  }

  private findRoot(nodeId: string): string {
    let cur = nodeId;
    while (this.parent.get(cur) !== cur) {
      cur = this.parent.get(cur)!;
    }
    return cur;
  }

  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      const parentId = this.parent.get(id);
      result[id] = {
        id,
        key: node.value,
        left: null,
        right: null,
        parent: parentId === id ? null : parentId ?? null,
        children: [],
      };
    }
    // Build children from parent pointers
    for (const [id] of this.nodes) {
      const parentId = this.parent.get(id);
      if (parentId && parentId !== id) {
        if (result[parentId]) {
          result[parentId].children!.push(id);
        }
      }
    }
    return result;
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "makeset":
        this.doMakeset(Number(args[0]), recorder, line);
        break;
      case "union":
        this.doUnion(Number(args[0]), Number(args[1]), recorder, line);
        break;
      case "find":
        this.doFind(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`UFCompress 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "tree",
      nodes: this.buildVisualNodes(),
      rootId: this.rootId,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      size: { type: "number", value: this.size, display: `${this.size}` },
    };
  }

  // ── 创建集合 ──

  private doMakeset(n: number, recorder: TraceRecorder, line: number): void {
    this.nodes.clear();
    this.parent.clear();
    this.idCounter = 0;
    this.size = n;
    this.rootId = null;

    // 创建 n 个独立节点，形成森林
    for (let i = 0; i < n; i++) {
      const id = this.nextId();
      this.nodes.set(id, { id, value: i });
      this.parent.set(id, id); // 每个节点的 parent 指向自己
    }

    // 设置 rootId 为第一个节点（代表整棵虚拟树的根）
    this.rootId = "ufc-1";

    recorder.record({
      type: "VISIT_NODE",
      title: `创建 ${n} 个独立集合`,
      description: `每个元素初始自成一个集合（parent 指向自身），共 ${n} 个集合`,
      codeLine: line,
      targets: [],
    });
  }

  // ── 查找（带路径压缩） ──

  private doFind(x: number, recorder: TraceRecorder, line: number): void {
    if (x < 0 || x >= this.size) throw new Error(`元素 ${x} 超出范围`);

    // 找到 x 对应的节点 id
    const nodeIds = Array.from(this.nodes.keys());
    const nodeId = nodeIds[x];

    recorder.record({
      type: "FIND",
      title: `查找元素 ${x} 的根`,
      description: `开始从元素 ${x} 沿 parent 指针向上查找`,
      codeLine: line,
      targets: [nodeId],
    });

    // 收集路径上的节点
    const path: string[] = [];
    let cur = nodeId;
    while (this.parent.get(cur) !== cur) {
      path.push(cur);
      cur = this.parent.get(cur)!;
    }
    const root = cur;

    // 高亮查找路径
    recorder.record({
      type: "FIND",
      title: `查找路径: ${path.map(id => this.getNode(id).value).join(" → ")} → ${this.getNode(root).value}`,
      description: `元素 ${x} 的根是 ${this.getNode(root).value}，路径长度 ${path.length}`,
      codeLine: line,
      targets: [...path, root],
    });

    // 路径压缩：将路径上所有节点直接指向根
    if (path.length > 1) {
      for (const nodeId of path) {
        const oldParent = this.parent.get(nodeId);
        this.parent.set(nodeId, root);

        if (oldParent !== root) {
          recorder.record({
            type: "LINK_NODE",
            title: `路径压缩: 元素 ${this.getNode(nodeId).value} 直接指向根 ${this.getNode(root).value}`,
            description: `将节点 ${this.getNode(nodeId).value} 的 parent 从 ${this.getNode(oldParent!).value} 改为 ${this.getNode(root).value}，加速后续查找`,
            codeLine: line,
            targets: [nodeId, root],
          });
        }
      }
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `查找完成: 元素 ${x} 的根是 ${this.getNode(root).value}`,
      description: `路径压缩已完成，后续查找将更快速`,
      codeLine: line,
      targets: [root],
      payload: { element: x, root: this.getNode(root).value },
    });
  }

  // ── 合并 ──

  private doUnion(a: number, b: number, recorder: TraceRecorder, line: number): void {
    if (a < 0 || a >= this.size || b < 0 || b >= this.size)
      throw new Error(`元素超出范围`);

    const nodeIds = Array.from(this.nodes.keys());
    const aId = nodeIds[a];
    const bId = nodeIds[b];

    recorder.record({
      type: "UNION",
      title: `合并元素 ${a} 和 ${b}`,
      description: `查找各自的根，然后合并`,
      codeLine: line,
      targets: [aId, bId],
    });

    const rootA = this.findRoot(aId);
    const rootB = this.findRoot(bId);

    if (rootA === rootB) {
      recorder.record({
        type: "VISIT_NODE",
        title: `元素 ${a} 和 ${b} 已在同一集合`,
        description: `根都是 ${this.getNode(rootA).value}，无需合并`,
        codeLine: line,
        targets: [rootA],
      });
      return;
    }

    // 合并：将 rootB 挂到 rootA 下
    this.parent.set(rootB, rootA);

    recorder.record({
      type: "LINK_NODE",
      title: `合并: 根 ${this.getNode(rootB).value} 挂到根 ${this.getNode(rootA).value} 下`,
      description: `将根 ${this.getNode(rootB).value} 的 parent 设为 ${this.getNode(rootA).value}，合并完成`,
      codeLine: line,
      targets: [rootA, rootB],
    });
  }
}
