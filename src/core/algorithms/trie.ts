import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface TrieNode {
  id: string;
  char: string;
  children: Map<string, string>; // char -> child nodeId
  parent: string | null;
  isEnd: boolean;
}

export class TrieRuntime implements StructureRuntime {
  private nodes = new Map<string, TrieNode>();
  private rootId: string | null = null;
  private nextId = 0;
  private wordCount = 0;

  private newId(): string {
    return `trie-${this.nextId++}`;
  }

  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      const childIds: string[] = [];
      for (const [, cid] of node.children) {
        childIds.push(cid);
      }

      result[id] = {
        id,
        key: node.char || "root",
        left: null,
        right: null,
        parent: node.parent,
        children: childIds.length > 0 ? childIds : undefined,
        color: node.isEnd ? "black" : "default",
        metadata: {
          isEnd: node.isEnd,
          edgeLabel: node.char || undefined,
        },
      };
    }
    return result;
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    switch (method) {
      case "insert":
        this.doInsert(String(args[0]), recorder, line);
        break;
      case "search":
        this.doSearch(String(args[0]), recorder, line);
        break;
      case "delete":
        this.doDelete(String(args[0]), recorder, line);
        break;
      default:
        throw new Error(`Trie 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return { type: "tree", nodes: this.buildVisualNodes(), rootId: this.rootId };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      nodes: { type: "number", value: this.nodes.size, display: `${this.nodes.size}` },
      words: { type: "number", value: this.wordCount, display: `${this.wordCount}` },
    };
  }

  private ensureRoot(recorder: TraceRecorder, line: number): void {
    if (this.rootId) return;
    const id = this.newId();
    this.nodes.set(id, { id, char: "", children: new Map(), parent: null, isEnd: false });
    this.rootId = id;

    recorder.record({
      type: "CREATE_NODE",
      title: "创建 Trie 根节点",
      description: "初始化空的根节点",
      codeLine: line,
      pseudoLine: 1,
      targets: [id],
    });
  }

  private doInsert(word: string, recorder: TraceRecorder, line: number): void {
    this.ensureRoot(recorder, line);

    recorder.record({
      type: "VISIT_NODE",
      title: `插入 "${word}"`,
      description: `向 Trie 中插入单词 "${word}"`,
      codeLine: line,
      pseudoLine: 1,
      targets: [this.rootId!],
    });

    let currentId = this.rootId!;

    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const current = this.nodes.get(currentId)!;

      if (current.children.has(ch)) {
        currentId = current.children.get(ch)!;

        recorder.record({
          type: "VISIT_NODE",
          title: `'${ch}' 已存在，沿已有路径前进`,
          description: `字符 '${ch}' 的节点已存在，无需新建`,
          codeLine: line,
          pseudoLine: 5,
          targets: [currentId],
        });
      } else {
        const newId = this.newId();
        const newNode: TrieNode = {
          id: newId,
          char: ch,
          children: new Map(),
          parent: currentId,
          isEnd: false,
        };
        this.nodes.set(newId, newNode);
        current.children.set(ch, newId);

        recorder.record({
          type: "CREATE_NODE",
          title: `创建节点 '${ch}'`,
          description: `字符 '${ch}' 不存在，创建新节点`,
          codeLine: line,
          pseudoLine: 4,
          targets: [newId],
        });

        currentId = newId;
      }
    }

    const lastNode = this.nodes.get(currentId)!;
    if (!lastNode.isEnd) {
      lastNode.isEnd = true;
      this.wordCount++;
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `标记单词 "${word}" 结束`,
      description: `路径终点标记为单词结束节点`,
      codeLine: line,
      pseudoLine: 6,
      targets: [currentId],
    });
  }

  private doSearch(word: string, recorder: TraceRecorder, line: number): void {
    this.ensureRoot(recorder, line);

    recorder.record({
      type: "VISIT_NODE",
      title: `查找 "${word}"`,
      description: `在 Trie 中查找单词 "${word}"`,
      codeLine: line,
      pseudoLine: 1,
      targets: [this.rootId!],
    });

    let currentId = this.rootId!;

    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const current = this.nodes.get(currentId)!;

      if (!current.children.has(ch)) {
        recorder.record({
          type: "COMPARE",
          title: `未找到 '${ch}'`,
          description: `在位置 ${i} 失配，字符 '${ch}' 不存在`,
          codeLine: line,
          pseudoLine: 3,
          targets: [currentId],
        });

        recorder.record({
          type: "VISIT_NODE",
          title: `查找失败: "${word}" 不在 Trie 中`,
          description: `路径在字符 '${ch}' 处断裂`,
          codeLine: line,
          pseudoLine: 3,
          targets: [],
        });
        return;
      }

      currentId = current.children.get(ch)!;

      recorder.record({
        type: "COMPARE",
        title: `匹配 '${ch}'`,
        description: `字符 '${ch}' 匹配成功`,
        codeLine: line,
        pseudoLine: 5,
        targets: [currentId],
      });
    }

    const lastNode = this.nodes.get(currentId)!;
    if (lastNode.isEnd) {
      recorder.record({
        type: "MARK_FINAL",
        title: `查找成功: "${word}" 在 Trie 中`,
        description: `路径完整且终点是单词结束节点`,
        codeLine: line,
        pseudoLine: 6,
        targets: [currentId],
      });
    } else {
      recorder.record({
        type: "VISIT_NODE",
        title: `"${word}" 是某个单词的前缀，但不是完整单词`,
        description: `路径完整但终点未被标记为单词结束`,
        codeLine: line,
        pseudoLine: 6,
        targets: [currentId],
      });
    }
  }

  private doDelete(word: string, recorder: TraceRecorder, line: number): void {
    this.ensureRoot(recorder, line);

    recorder.record({
      type: "VISIT_NODE",
      title: `删除 "${word}"`,
      description: `从 Trie 中删除单词 "${word}"`,
      codeLine: line,
      pseudoLine: 8,
      targets: [this.rootId!],
    });

    // 沿路径搜索，记录路径上所有节点
    let currentId = this.rootId!;
    const path: string[] = [currentId]; // 路径上的节点 id（含根节点）

    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const current = this.nodes.get(currentId)!;

      if (!current.children.has(ch)) {
        recorder.record({
          type: "COMPARE",
          title: `未找到 '${ch}'`,
          description: `在位置 ${i} 失配，字符 '${ch}' 不存在`,
          codeLine: line,
          pseudoLine: 8,
          targets: [currentId],
        });

        recorder.record({
          type: "VISIT_NODE",
          title: `删除失败: "${word}" 不在 Trie 中`,
          description: `路径在字符 '${ch}' 处断裂，无法删除`,
          codeLine: line,
          pseudoLine: 1,
          targets: [],
        });
        return;
      }

      currentId = current.children.get(ch)!;
      path.push(currentId);

      recorder.record({
        type: "COMPARE",
        title: `匹配 '${ch}'`,
        description: `字符 '${ch}' 匹配成功`,
        codeLine: line,
        pseudoLine: 8,
        targets: [currentId],
      });
    }

    const lastNode = this.nodes.get(currentId)!;

    // 检查终点是否是单词结束节点
    if (!lastNode.isEnd) {
      recorder.record({
        type: "VISIT_NODE",
        title: `删除失败: "${word}" 不是完整单词`,
        description: `路径完整但终点未被标记为单词结束`,
        codeLine: line,
        pseudoLine: 2,
        targets: [currentId],
      });
      return;
    }

    // 标记 isEnd = false
    lastNode.isEnd = false;
    this.wordCount--;

    recorder.record({
      type: "MARK_FINAL",
      title: `取消标记 "${word}" 的结束节点`,
      description: `将终点节点的 isEnd 标记为 false`,
      codeLine: line,
      pseudoLine: 3,
      targets: [currentId],
    });

    // 从叶子向上回溯，删除没有子节点且不是其他单词结尾的节点
    let nodeId = path.pop()!; // 当前叶子节点（终点）

    while (nodeId !== this.rootId) {
      const node = this.nodes.get(nodeId)!;

      // 如果该节点还有子节点或是其他单词的结尾，停止删除
      if (node.children.size > 0 || node.isEnd) {
        break;
      }

      const parentId = node.parent!;
      const parent = this.nodes.get(parentId)!;

      // 从父节点的 children 中移除当前节点
      parent.children.delete(node.char);

      recorder.record({
        type: "UNLINK_NODE",
        title: `断开节点 '${node.char}' 的连接`,
        description: `从父节点移除到 '${node.char}' 的边`,
        codeLine: line,
        pseudoLine: 5,
        targets: [parentId],
      });

      // 删除该节点
      this.nodes.delete(nodeId);

      recorder.record({
        type: "DELETE_NODE",
        title: `删除节点 '${node.char}'`,
        description: `节点 '${node.char}' 无子节点且不是其他单词结尾，安全删除`,
        codeLine: line,
        pseudoLine: 5,
        targets: [],
      });

      nodeId = parentId;
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `删除完成: "${word}"`,
      description: `单词 "${word}" 已从 Trie 中删除`,
      codeLine: line,
      pseudoLine: 11,
      targets: [],
    });
  }
}
