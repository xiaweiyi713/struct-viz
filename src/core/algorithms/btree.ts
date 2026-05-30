import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface BTreeNode {
  id: string;
  keys: number[];
  children: string[];
  parent: string | null;
  isLeaf: boolean;
}

export class BTreeRuntime implements StructureRuntime {
  private nodes = new Map<string, BTreeNode>();
  private rootId: string | null = null;
  private nextId = 0;
  private t: number; // 最小度

  constructor(t = 3) {
    this.t = t;
  }

  private newId(): string {
    return `btn-${this.nextId++}`;
  }

  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      result[id] = {
        id,
        key: node.keys.join("|"),
        left: null,
        right: null,
        parent: node.parent,
        children: node.children.length > 0 ? [...node.children] : undefined,
        metadata: {
          keys: [...node.keys],
          isLeaf: node.isLeaf,
        },
      };
    }
    return result;
  }

  executeMethod(method: string, args: Literal[], recorder: TraceRecorder, line: number): void {
    switch (method) {
      case "insert":
        for (const a of args) this.doInsert(Number(a), recorder, line);
        break;
      case "delete":
        for (const a of args) this.doDelete(Number(a), recorder, line);
        break;
      case "search":
        this.doSearch(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`BTree 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return { type: "tree", nodes: this.buildVisualNodes(), rootId: this.rootId };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      degree: { type: "number", value: this.t, display: `${this.t}` },
      nodes: { type: "number", value: this.nodes.size, display: `${this.nodes.size}` },
    };
  }

  private doInsert(key: number, recorder: TraceRecorder, line: number): void {
    recorder.record({
      type: "VISIT_NODE",
      title: `插入 ${key}`,
      description: `开始插入关键字 ${key}`,
      codeLine: line,
      targets: [],
    });

    if (!this.rootId) {
      const root = this.createNode(true);
      root.keys.push(key);
      this.rootId = root.id;

      recorder.record({
        type: "CREATE_NODE",
        title: `创建根节点，插入 ${key}`,
        description: `B 树为空，创建根节点`,
        codeLine: line,
        targets: [root.id],
      });
      return;
    }

    // 如果根节点满了，先分裂
    const root = this.nodes.get(this.rootId)!;
    if (root.keys.length === 2 * this.t - 1) {
      const newRoot = this.createNode(false);
      newRoot.children.push(this.rootId);
      root.parent = newRoot.id;
      this.rootId = newRoot.id;

      recorder.record({
        type: "SPLIT_NODE",
        title: "根节点已满，分裂",
        description: `根节点关键字数达到 ${2 * this.t - 1}，创建新根并分裂`,
        codeLine: line,
        targets: [newRoot.id],
      });

      this.splitChild(newRoot, 0, recorder, line);
    }

    this.insertNonFull(this.rootId, key, recorder, line);
  }

  // ── 查找 ──

  private doSearch(key: number, recorder: TraceRecorder, line: number): void {
    if (!this.rootId) {
      recorder.record({
        type: "VISIT_NODE",
        title: `查找 ${key}：B 树为空`,
        description: "B 树为空，查找失败",
        codeLine: line,
        targets: [],
      });
      return;
    }

    this.searchInNode(this.rootId, key, recorder, line);
  }

  private searchInNode(nodeId: string, key: number, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;

    recorder.record({
      type: "VISIT_NODE",
      title: `访问节点 [${node.keys.join(", ")}]`,
      description: `在节点中查找 ${key}`,
      codeLine: line,
      targets: [nodeId],
    });

    // 在当前节点的 keys 中查找
    let idx = 0;
    while (idx < node.keys.length && node.keys[idx] < key) idx++;

    if (idx < node.keys.length && node.keys[idx] === key) {
      // 在当前节点中找到了
      recorder.record({
        type: "COMPARE",
        title: `找到 ${key}`,
        description: `在节点 [${node.keys.join(", ")}] 中找到关键字 ${key}`,
        codeLine: line,
        targets: [nodeId],
        payload: { found: true },
      });
      return;
    }

    if (node.isLeaf) {
      // 到达叶子节点仍未找到
      recorder.record({
        type: "COMPARE",
        title: `查找 ${key}：未找到`,
        description: `搜索到叶子节点 [${node.keys.join(", ")}] 仍未找到 ${key}`,
        codeLine: line,
        targets: [nodeId],
        payload: { found: false },
      });
      return;
    }

    // 进入对应的子节点继续查找
    recorder.record({
      type: "COMPARE",
      title: `${key} 可能在子树 ${idx} 中`,
      description: `${key} 不在当前节点，进入第 ${idx} 个子节点继续查找`,
      codeLine: line,
      targets: [nodeId],
      payload: { direction: "child", childIndex: idx },
    });

    this.searchInNode(node.children[idx], key, recorder, line);
  }

  private createNode(isLeaf: boolean): BTreeNode {
    const id = this.newId();
    const node: BTreeNode = { id, keys: [], children: [], parent: null, isLeaf };
    this.nodes.set(id, node);
    return node;
  }

  private splitChild(parent: BTreeNode, index: number, recorder: TraceRecorder, line: number): void {
    const t = this.t;
    const child = this.nodes.get(parent.children[index])!;
    const sibling = this.createNode(child.isLeaf);

    // 标记分裂
    const nodeMeta = this.nodes.get(child.id);
    if (nodeMeta) {
      (nodeMeta as { _status?: string })._status = "active";
    }

    // 提升中间键
    const promotedKey = child.keys[t - 1];
    parent.keys.splice(index, 0, promotedKey);
    parent.children.splice(index + 1, 0, sibling.id);
    sibling.parent = parent.id;

    // 分配键
    sibling.keys = child.keys.splice(t);
    child.keys.splice(t - 1, 1);

    // 分配子节点
    if (!child.isLeaf) {
      sibling.children = child.children.splice(t);
      for (const cid of sibling.children) {
        const cn = this.nodes.get(cid);
        if (cn) cn.parent = sibling.id;
      }
    }

    recorder.record({
      type: "PROMOTE_KEY",
      title: `分裂: 提升 ${promotedKey}`,
      description: `节点关键字超过 ${2 * t - 1}，将 ${promotedKey} 提升到父节点`,
      codeLine: line,
      targets: [parent.id, child.id, sibling.id],
    });
  }

  private insertNonFull(nodeId: string, key: number, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const t = this.t;

    // 高亮当前节点
    const nodeMeta = this.nodes.get(nodeId);
    if (nodeMeta) {
      (nodeMeta as { _highlightedKeys?: number[] })._highlightedKeys = [key];
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `访问节点 [${node.keys.join(", ")}]`,
      description: `查找 ${key} 的插入位置`,
      codeLine: line,
      targets: [nodeId],
    });

    if (node.isLeaf) {
      // 找到插入位置
      let pos = 0;
      while (pos < node.keys.length && node.keys[pos] < key) pos++;

      node.keys.splice(pos, 0, key);

      recorder.record({
        type: "CREATE_NODE",
        title: `在叶子节点插入 ${key}`,
        description: `位置 ${pos}，节点关键字: [${node.keys.join(", ")}]`,
        codeLine: line,
        targets: [nodeId],
      });
    } else {
      // 找到子节点
      let pos = 0;
      while (pos < node.keys.length && node.keys[pos] < key) pos++;

      const childId = node.children[pos];
      const child = this.nodes.get(childId)!;

      if (child.keys.length === 2 * t - 1) {
        this.splitChild(node, pos, recorder, line);

        // 分裂后决定往哪个子节点插入
        if (key > node.keys[pos]) {
          this.insertNonFull(node.children[pos + 1], key, recorder, line);
        } else {
          this.insertNonFull(node.children[pos], key, recorder, line);
        }
      } else {
        this.insertNonFull(childId, key, recorder, line);
      }
    }

    // 清理高亮
    const meta = this.nodes.get(nodeId);
    if (meta) delete (meta as { _highlightedKeys?: number[] })._highlightedKeys;
  }

  // ── Delete ──

  private doDelete(key: number, recorder: TraceRecorder, line: number): void {
    if (!this.rootId) {
      recorder.record({
        type: "COMPARE",
        title: `删除 ${key}`,
        description: `B 树为空，无法删除`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `删除 ${key}`,
      description: `开始从 B 树中删除关键字 ${key}`,
      codeLine: line,
      targets: [],
    });

    this.deleteFromNode(this.rootId!, key, recorder, line);

    // 如果根节点变空（只剩一个空子节点），降低树高
    const root = this.nodes.get(this.rootId!);
    if (root && root.keys.length === 0 && !root.isLeaf) {
      const oldRootId = this.rootId!;
      this.rootId = root.children[0];
      const newRoot = this.nodes.get(this.rootId!);
      if (newRoot) newRoot.parent = null;
      this.nodes.delete(oldRootId);

      recorder.record({
        type: "DELETE_NODE",
        title: "根节点变空，降低树高",
        description: `删除空根节点，新根为 [${newRoot?.keys.join(", ") ?? ""}]`,
        codeLine: line,
        targets: [this.rootId!],
      });
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `删除 ${key} 完成`,
      description: `B 树删除操作结束`,
      codeLine: line,
      targets: [],
    });
  }

  private deleteFromNode(nodeId: string, key: number, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const t = this.t;

    recorder.record({
      type: "COMPARE",
      title: `在节点 [${node.keys.join(", ")}] 中查找 ${key}`,
      description: `搜索关键字 ${key}`,
      codeLine: line,
      targets: [nodeId],
    });

    // 查找 key 在当前节点中的位置
    let idx = 0;
    while (idx < node.keys.length && node.keys[idx] < key) idx++;

    if (idx < node.keys.length && node.keys[idx] === key) {
      // key 在当前节点中
      if (node.isLeaf) {
        // 情况 1：key 在叶子节点中，直接删除
        node.keys.splice(idx, 1);

        recorder.record({
          type: "DELETE_NODE",
          title: `从叶子节点删除 ${key}`,
          description: `节点关键字变为 [${node.keys.join(", ")}]`,
          codeLine: line,
          targets: [nodeId],
        });
      } else {
        // 情况 2：key 在内部节点中
        this.deleteFromInternalNode(nodeId, idx, key, recorder, line);
      }
    } else {
      // key 不在当前节点中
      if (node.isLeaf) {
        recorder.record({
          type: "COMPARE",
          title: `${key} 不在树中`,
          description: `搜索到叶子节点仍未找到 ${key}`,
          codeLine: line,
          targets: [nodeId],
        });
        return;
      }

      // 情况 3：key 可能在子节点中，需要确保子节点至少有 t 个 key
      const childId = node.children[idx];

      // 标记即将进入的子节点
      recorder.record({
        type: "VISIT_NODE",
        title: `进入子节点 [${this.nodes.get(childId)?.keys.join(", ") ?? ""}]`,
        description: `key ${key} 可能在索引 ${idx} 的子树中`,
        codeLine: line,
        targets: [childId],
      });

      const child = this.nodes.get(childId)!;
      if (child.keys.length < t) {
        // 子节点 key 太少，需要先填充
        this.fillChild(nodeId, idx, recorder, line);
      }

      // fill 可能改变了 children 的结构，需要重新确定正确的子节点
      const nodeAfterFill = this.nodes.get(nodeId)!;
      // 如果合并导致子节点数减少，需要调整 idx
      const adjustedIdx = Math.min(idx, nodeAfterFill.children.length - 1);
      this.deleteFromNode(nodeAfterFill.children[adjustedIdx], key, recorder, line);
    }
  }

  private deleteFromInternalNode(nodeId: string, idx: number, key: number, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const t = this.t;

    // 获取前驱子节点和后继子节点
    const predChildId = node.children[idx];
    const succChildId = node.children[idx + 1];
    const predChild = this.nodes.get(predChildId)!;
    const succChild = this.nodes.get(succChildId)!;

    if (predChild.keys.length >= t) {
      // 情况 2a：前驱子节点有足够的 key，用前驱替换
      const predecessor = this.getPredecessor(predChildId, recorder, line);

      recorder.record({
        type: "PROMOTE_KEY",
        title: `用前驱 ${predecessor} 替换 ${key}`,
        description: `左子树最大值 ${predecessor} 上移替换 ${key}`,
        codeLine: line,
        targets: [nodeId, predChildId],
      });

      node.keys[idx] = predecessor;
      this.deleteFromNode(predChildId, predecessor, recorder, line);
    } else if (succChild.keys.length >= t) {
      // 情况 2b：后继子节点有足够的 key，用后继替换
      const successor = this.getSuccessor(succChildId, recorder, line);

      recorder.record({
        type: "PROMOTE_KEY",
        title: `用后继 ${successor} 替换 ${key}`,
        description: `右子树最小值 ${successor} 上移替换 ${key}`,
        codeLine: line,
        targets: [nodeId, succChildId],
      });

      node.keys[idx] = successor;
      this.deleteFromNode(succChildId, successor, recorder, line);
    } else {
      // 情况 2c：前驱和后继子节点都只有 t-1 个 key，合并后递归删除
      this.mergeChildren(nodeId, idx, recorder, line);
      // 合并后 key 被下移到了合并后的节点（即原来的 predChildId）中
      this.deleteFromNode(predChildId, key, recorder, line);
    }
  }

  /** 获取以 nodeId 为根的子树中的最大 key */
  private getPredecessor(nodeId: string, recorder: TraceRecorder, line: number): number {
    let cur = this.nodes.get(nodeId)!;
    while (!cur.isLeaf) {
      recorder.record({
        type: "COMPARE",
        title: `查找前驱: 访问 [${cur.keys.join(", ")}]`,
        description: `沿右子树向下查找最大值`,
        codeLine: line,
        targets: [cur.id],
      });
      cur = this.nodes.get(cur.children[cur.children.length - 1])!;
    }
    recorder.record({
      type: "COMPARE",
      title: `前驱为 ${cur.keys[cur.keys.length - 1]}`,
      description: `在叶子节点 [${cur.keys.join(", ")}] 中找到`,
      codeLine: line,
      targets: [cur.id],
    });
    return cur.keys[cur.keys.length - 1];
  }

  /** 获取以 nodeId 为根的子树中的最小 key */
  private getSuccessor(nodeId: string, recorder: TraceRecorder, line: number): number {
    let cur = this.nodes.get(nodeId)!;
    while (!cur.isLeaf) {
      recorder.record({
        type: "COMPARE",
        title: `查找后继: 访问 [${cur.keys.join(", ")}]`,
        description: `沿左子树向下查找最小值`,
        codeLine: line,
        targets: [cur.id],
      });
      cur = this.nodes.get(cur.children[0])!;
    }
    recorder.record({
      type: "COMPARE",
      title: `后继为 ${cur.keys[0]}`,
      description: `在叶子节点 [${cur.keys.join(", ")}] 中找到`,
      codeLine: line,
      targets: [cur.id],
    });
    return cur.keys[0];
  }

  /** 确保第 idx 个子节点至少有 t 个 key（借位或合并） */
  private fillChild(nodeId: string, idx: number, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const t = this.t;

    // 尝试从左兄弟借位
    if (idx > 0) {
      const leftSiblingId = node.children[idx - 1];
      const leftSibling = this.nodes.get(leftSiblingId)!;
      if (leftSibling.keys.length >= t) {
        this.borrowFromLeft(nodeId, idx, recorder, line);
        return;
      }
    }

    // 尝试从右兄弟借位
    if (idx < node.children.length - 1) {
      const rightSiblingId = node.children[idx + 1];
      const rightSibling = this.nodes.get(rightSiblingId)!;
      if (rightSibling.keys.length >= t) {
        this.borrowFromRight(nodeId, idx, recorder, line);
        return;
      }
    }

    // 无法借位，执行合并
    if (idx < node.children.length - 1) {
      // 与右兄弟合并
      this.mergeChildren(nodeId, idx, recorder, line);
    } else {
      // 是最后一个子节点，与左兄弟合并
      this.mergeChildren(nodeId, idx - 1, recorder, line);
    }
  }

  /** 从左兄弟借位（右旋）：左兄弟最大 key 上移到父，父 key 下移到当前子节点 */
  private borrowFromLeft(nodeId: string, idx: number, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const childId = node.children[idx];
    const leftSiblingId = node.children[idx - 1];
    const child = this.nodes.get(childId)!;
    const leftSibling = this.nodes.get(leftSiblingId)!;

    // 父 key 下移到子节点头部
    child.keys.unshift(node.keys[idx - 1]);

    // 左兄弟最后一个子节点移到 child 头部
    if (!leftSibling.isLeaf) {
      const movedChildId = leftSibling.children.pop()!;
      child.children.unshift(movedChildId);
      const movedChild = this.nodes.get(movedChildId);
      if (movedChild) movedChild.parent = childId;
    }

    // 左兄弟最大 key 上移到父
    const borrowedKey = leftSibling.keys.pop()!;
    node.keys[idx - 1] = borrowedKey;

    recorder.record({
      type: "ROTATE_RIGHT",
      title: `从左兄弟借位 ${borrowedKey}`,
      description: `左兄弟最大 key ${borrowedKey} 上移到父，父 key 下移到当前节点`,
      codeLine: line,
      targets: [nodeId, leftSiblingId, childId],
    });
  }

  /** 从右兄弟借位（左旋）：右兄弟最小 key 上移到父，父 key 下移到当前子节点 */
  private borrowFromRight(nodeId: string, idx: number, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const childId = node.children[idx];
    const rightSiblingId = node.children[idx + 1];
    const child = this.nodes.get(childId)!;
    const rightSibling = this.nodes.get(rightSiblingId)!;

    // 父 key 下移到子节点尾部
    child.keys.push(node.keys[idx]);

    // 右兄弟第一个子节点移到 child 尾部
    if (!rightSibling.isLeaf) {
      const movedChildId = rightSibling.children.shift()!;
      child.children.push(movedChildId);
      const movedChild = this.nodes.get(movedChildId);
      if (movedChild) movedChild.parent = childId;
    }

    // 右兄弟最小 key 上移到父
    const borrowedKey = rightSibling.keys.shift()!;
    node.keys[idx] = borrowedKey;

    recorder.record({
      type: "ROTATE_LEFT",
      title: `从右兄弟借位 ${borrowedKey}`,
      description: `右兄弟最小 key ${borrowedKey} 上移到父，父 key 下移到当前节点`,
      codeLine: line,
      targets: [nodeId, rightSiblingId, childId],
    });
  }

  /** 将第 idx 和 idx+1 个子节点合并：child[idx] + parent.keys[idx] + child[idx+1] → child[idx] */
  private mergeChildren(nodeId: string, idx: number, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const leftChildId = node.children[idx];
    const rightChildId = node.children[idx + 1];
    const leftChild = this.nodes.get(leftChildId)!;
    const rightChild = this.nodes.get(rightChildId)!;

    // 父 key 下移到左子节点
    const separatorKey = node.keys[idx];
    leftChild.keys.push(separatorKey);

    // 右子节点的 key 全部并入左子节点
    leftChild.keys.push(...rightChild.keys);

    // 右子节点的子节点全部并入左子节点
    if (!rightChild.isLeaf) {
      for (const cid of rightChild.children) {
        leftChild.children.push(cid);
        const cn = this.nodes.get(cid);
        if (cn) cn.parent = leftChildId;
      }
    }

    // 从父节点移除分隔 key 和右子节点引用
    node.keys.splice(idx, 1);
    node.children.splice(idx + 1, 1);

    // 删除右子节点
    this.nodes.delete(rightChildId);

    recorder.record({
      type: "SPLIT_NODE",
      title: `合并节点: ${separatorKey}`,
      description: `将子节点与兄弟合并，父 key ${separatorKey} 下移。合并后 [${leftChild.keys.join(", ")}]`,
      codeLine: line,
      targets: [nodeId, leftChildId],
    });
  }
}
