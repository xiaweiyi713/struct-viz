import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── HuffmanDecodeRuntime ──

interface HuffmanNode {
  id: string;
  key: number;
  left: string | null;
  right: string | null;
  parent: string | null;
  isLeaf: boolean;
  label?: string;
  code?: string;
}

export class HuffmanDecodeRuntime implements StructureRuntime {
  private nodes = new Map<string, HuffmanNode>();
  private rootId: string | null = null;
  private idCounter = 0;
  private charCodeMap = new Map<string, string>();

  private nextId(): string {
    this.idCounter += 1;
    return `hfd-${this.idCounter}`;
  }

  private getNode(id: string): HuffmanNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`节点 ${id} 不存在`);
    return node;
  }

  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      result[id] = {
        id,
        key: node.label ?? node.key,
        left: node.left,
        right: node.right,
        parent: node.parent,
        metadata: {
          weight: node.key,
          isLeaf: node.isLeaf,
          code: node.code,
        },
      };
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
      case "build":
        this.doBuild(args.map(Number), recorder, line);
        break;
      case "encode":
        this.doEncode(String(args[0]), recorder, line);
        break;
      default:
        throw new Error(`HuffmanDecode 不支持方法 "${method}"`);
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
      nodeCount: { type: "number", value: this.nodes.size, display: `${this.nodes.size}` },
    };
  }

  // ── 生成编码表 ──

  private buildCodeTable(nodeId: string | null, prefix: string): void {
    if (!nodeId) return;
    const node = this.getNode(nodeId);
    if (node.isLeaf) {
      node.code = prefix || "0";
      this.charCodeMap.set(node.label ?? String(node.key), node.code);
      return;
    }
    this.buildCodeTable(node.left, prefix + "0");
    this.buildCodeTable(node.right, prefix + "1");
  }

  // ── 构建哈夫曼树 ──

  private doBuild(freqs: number[], recorder: TraceRecorder, line: number): void {
    this.nodes.clear();
    this.rootId = null;
    this.idCounter = 0;
    this.charCodeMap.clear();

    recorder.record({
      type: "VISIT_NODE",
      title: "开始构建哈夫曼编码树",
      description: `频率序列: [${freqs.join(", ")}]，共 ${freqs.length} 个字符`,
      codeLine: line,
      targets: [],
    });

    // 创建叶子节点，分配字符标签
    const labels = "ABCDEFGHIJKLMNO";
    const forest: string[] = [];
    for (let i = 0; i < freqs.length; i++) {
      const id = this.nextId();
      const label = labels[i] ?? String(i);
      this.nodes.set(id, {
        id,
        key: freqs[i],
        left: null,
        right: null,
        parent: null,
        isLeaf: true,
        label,
      });
      forest.push(id);

      recorder.record({
        type: "CREATE_NODE",
        title: `创建叶子节点 ${label}（频率 ${freqs[i]}）`,
        description: `字符 ${label} 出现频率为 ${freqs[i]}`,
        codeLine: line,
        targets: [id],
      });
    }

    // 逐步合并
    while (forest.length > 1) {
      forest.sort((a, b) => this.getNode(a).key - this.getNode(b).key);
      const leftId = forest[0];
      const rightId = forest[1];
      const leftNode = this.getNode(leftId);
      const rightNode = this.getNode(rightId);
      const newWeight = leftNode.key + rightNode.key;

      recorder.record({
        type: "COMPARE",
        title: `选择最小频率: ${leftNode.label ?? leftNode.key}(${leftNode.key}) 和 ${rightNode.label ?? rightNode.key}(${rightNode.key})`,
        description: `合并为内部节点（频率 ${newWeight}）`,
        codeLine: line,
        targets: [leftId, rightId],
      });

      const parentId = this.nextId();
      this.nodes.set(parentId, {
        id: parentId,
        key: newWeight,
        left: leftId,
        right: rightId,
        parent: null,
        isLeaf: false,
      });
      leftNode.parent = parentId;
      rightNode.parent = parentId;

      forest.splice(0, 2);
      forest.push(parentId);

      recorder.record({
        type: "LINK_NODE",
        title: `合并: ${leftNode.key} + ${rightNode.key} = ${newWeight}`,
        description: `左子: ${leftNode.label ?? leftNode.key}(${leftNode.key})，右子: ${rightNode.label ?? rightNode.key}(${rightNode.key})`,
        codeLine: line,
        targets: [parentId, leftId, rightId],
      });
    }

    this.rootId = forest[0];

    // 生成编码表
    this.buildCodeTable(this.rootId, "");

    const codeStr = Array.from(this.charCodeMap.entries())
      .map(([ch, code]) => `${ch}: ${code}`)
      .join(", ");

    recorder.record({
      type: "MARK_FINAL",
      title: "哈夫曼树构建完成",
      description: `编码表: { ${codeStr} }。根节点权值: ${this.getNode(this.rootId).key}`,
      codeLine: line,
      targets: [this.rootId],
      payload: { codes: Object.fromEntries(this.charCodeMap) },
    });
  }

  // ── 编码字符 ──

  private doEncode(char: string, recorder: TraceRecorder, line: number): void {
    const code = this.charCodeMap.get(char);
    if (code === undefined) {
      throw new Error(`字符 "${char}" 不在编码表中`);
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `编码字符 "${char}"`,
      description: `从根节点出发，左走 0，右走 1`,
      codeLine: line,
      targets: [this.rootId!],
    });

    // 沿路径逐步展示
    let cur = this.rootId!;
    for (let i = 0; i < code.length; i++) {
      const bit = code[i];
      const node = this.getNode(cur);
      const nextId = bit === "0" ? node.left : node.right;

      recorder.record({
        type: "VISIT_NODE",
        title: `${bit} → ${bit === "0" ? "左" : "右"}子`,
        description: `当前编码前缀: ${code.substring(0, i + 1)}`,
        codeLine: line,
        targets: [nextId!],
      });

      cur = nextId!;
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `字符 "${char}" 的编码: ${code}`,
      description: `哈夫曼编码长度: ${code.length} 位`,
      codeLine: line,
      targets: [cur],
      payload: { char, code },
    });
  }
}
