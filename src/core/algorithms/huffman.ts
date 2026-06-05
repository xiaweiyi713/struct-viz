import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface HuffmanNode {
  id: string;
  key: number;
  left: string | null;
  right: string | null;
  parent: string | null;
  isLeaf: boolean;
  label?: string;
}

export class HuffmanTreeRuntime implements StructureRuntime {
  private nodes = new Map<string, HuffmanNode>();
  private rootId: string | null = null;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `hf-node-${this.idCounter}`;
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
        metadata: { weight: node.key, isLeaf: node.isLeaf },
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
    if (method !== "build") throw new Error(`Huffman 不支持方法 "${method}"`);
    this.doBuild(args.map((a) => Number(a)), recorder, line);
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
      nodeCount: {
        type: "number",
        value: this.nodes.size,
        display: `${this.nodes.size}`,
      },
    };
  }

  private doBuild(weights: number[], recorder: TraceRecorder, line: number): void {
    recorder.record({
      type: "VISIT_NODE",
      title: "开始构建哈夫曼树",
      description: `权值序列: [${weights.join(", ")}]，共 ${weights.length} 个权值`,
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    // 创建叶子节点
    const forest: string[] = [];
    for (let i = 0; i < weights.length; i++) {
      const id = this.nextId();
      this.nodes.set(id, {
        id,
        key: weights[i],
        left: null,
        right: null,
        parent: null,
        isLeaf: true,
        label: `${weights[i]}`,
      });
      forest.push(id);

      recorder.record({
        type: "CREATE_NODE",
        title: `创建叶子节点（权值 ${weights[i]}）`,
        description: `初始森林中添加权值为 ${weights[i]} 的叶子节点`,
        codeLine: line,
        pseudoLine: 2,
        targets: [id],
      });
    }

    // 逐步合并
    while (forest.length > 1) {
      // 找最小的两个
      forest.sort((a, b) => this.getNode(a).key - this.getNode(b).key);
      const leftId = forest[0];
      const rightId = forest[1];

      const leftNode = this.getNode(leftId);
      const rightNode = this.getNode(rightId);
      const newWeight = leftNode.key + rightNode.key;

      recorder.record({
        type: "COMPARE",
        title: `选择最小的两个节点: ${leftNode.key} 和 ${rightNode.key}`,
        description: `从森林中选取权值最小的两个节点 ${leftNode.key} 和 ${rightNode.key}，合并为新节点（权值 ${newWeight}）`,
        codeLine: line,
        pseudoLine: 4,
        targets: [leftId, rightId],
      });

      // 创建新内部节点
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

      // 从森林中移除两个，加入新节点
      forest.splice(0, 2);
      forest.push(parentId);

      recorder.record({
        type: "LINK_NODE",
        title: `合并为新节点 ${newWeight}（${leftNode.key} + ${rightNode.key}）`,
        description: `左子: ${leftNode.key}，右子: ${rightNode.key}，新节点权值: ${newWeight}。剩余 ${forest.length} 棵树`,
        codeLine: line,
        pseudoLine: 8,
        targets: [parentId, leftId, rightId],
        payload: { leftWeight: leftNode.key, rightWeight: rightNode.key, newWeight },
      });
    }

    this.rootId = forest[0];

    recorder.record({
      type: "MARK_FINAL",
      title: "哈夫曼树构建完成",
      description: `根节点权值: ${this.getNode(this.rootId).key}，WPL（带权路径长度）即为根节点权值`,
      codeLine: line,
      pseudoLine: 10,
      targets: [this.rootId],
    });
  }
}
