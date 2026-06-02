import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── 内部节点结构 ──

interface BSTNode {
  id: string;
  key: number;
  left: string | null;
  right: string | null;
  parent: string | null;
  pending?: boolean;
}

// ── BSTRuntime ──

export class BSTRuntime implements StructureRuntime {
  private nodes = new Map<string, BSTNode>();
  private rootId: string | null = null;
  private idCounter = 0;

  // ── 工具方法 ──

  private nextId(): string {
    this.idCounter += 1;
    return `bst-node-${this.idCounter}`;
  }

  private getNode(id: string): BSTNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`节点 ${id} 不存在`);
    return node;
  }

  /** 将内部节点转换为可视化节点 */
  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      result[id] = {
        id,
        key: node.key,
        left: node.left,
        right: node.right,
        parent: node.parent,
        metadata: node.pending ? { pending: true } : undefined,
      };
    }
    return result;
  }

  // ── StructureRuntime 实现 ──

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "insert":
        this.doInsert(Number(args[0]), recorder, line);
        break;
      case "search":
        this.doSearch(Number(args[0]), recorder, line);
        break;
      case "delete":
        this.doDelete(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`BST 不支持方法 "${method}"`);
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
    const rootNode = this.rootId ? this.nodes.get(this.rootId) : null;

    return {
      nodeCount: {
        type: "number",
        value: this.nodes.size,
        display: `${this.nodes.size}`,
      },
      root: rootNode
        ? { type: "node", value: this.rootId, display: `Node(${rootNode.key})` }
        : { type: "null", value: null, display: "null" },
    };
  }

  // ── BST 操作 ──

  private doInsert(key: number, recorder: TraceRecorder, line: number): void {
    const id = this.nextId();
    const newNode: BSTNode = {
      id,
      key,
      left: null,
      right: null,
      parent: null,
    };

    // 1. 空树：直接设为根
    if (this.rootId === null) {
      this.nodes.set(id, newNode);
      this.rootId = id;

      recorder.record({
        type: "LINK_NODE",
        title: `${key} 设为根节点`,
        description: `树为空，将 ${key} 直接设为根节点`,
        codeLine: line,
        targets: [id],
        payload: { role: "root" },
      });
      return;
    }

    // 2. 非空树：沿路径比较找到插入位置
    let currentId = this.rootId;

    while (currentId !== null) {
      const current = this.getNode(currentId);

      // 比较
      const goLeft = key < current.key;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description: `${key} ${goLeft ? "<" : ">="} ${current.key}，${goLeft ? "向左子树移动" : "向右子树移动"}`,
        codeLine: line,
        targets: [currentId],
        payload: { direction: goLeft ? "left" : "right" },
      });

      if (goLeft) {
        if (current.left === null) {
          // 第一步：新节点待命（已创建，尚未接入树，显示在树上方待命区）
          newNode.pending = true;
          this.nodes.set(id, newNode);
          recorder.record({
            type: "CREATE_NODE",
            title: `创建新节点 ${key}（待插入）`,
            description: `找到插入位置：${key} < ${current.key} 且 ${current.key} 左子树为空。新节点 ${key} 已创建并在一旁待命，下一步接入树`,
            codeLine: line,
            targets: [id],
            payload: { pending: true },
          });

          // 第二步：接入为左子节点（从待命区飞入）
          newNode.pending = false;
          current.left = id;
          newNode.parent = currentId;
          recorder.record({
            type: "LINK_NODE",
            title: `${key} 插入为 ${current.key} 的左子节点`,
            description: `将待命的新节点 ${key} 挂载为 ${current.key} 的左子节点`,
            codeLine: line,
            targets: [currentId, id],
            payload: { parentKey: current.key, direction: "left" },
          });
          return;
        }
        currentId = current.left;
      } else {
        if (current.right === null) {
          // 第一步：新节点待命（已创建，尚未接入树，显示在树上方待命区）
          newNode.pending = true;
          this.nodes.set(id, newNode);
          recorder.record({
            type: "CREATE_NODE",
            title: `创建新节点 ${key}（待插入）`,
            description: `找到插入位置：${key} >= ${current.key} 且 ${current.key} 右子树为空。新节点 ${key} 已创建并在一旁待命，下一步接入树`,
            codeLine: line,
            targets: [id],
            payload: { pending: true },
          });

          // 第二步：接入为右子节点（从待命区飞入）
          newNode.pending = false;
          current.right = id;
          newNode.parent = currentId;
          recorder.record({
            type: "LINK_NODE",
            title: `${key} 插入为 ${current.key} 的右子节点`,
            description: `将待命的新节点 ${key} 挂载为 ${current.key} 的右子节点`,
            codeLine: line,
            targets: [currentId, id],
            payload: { parentKey: current.key, direction: "right" },
          });
          return;
        }
        currentId = current.right;
      }
    }
  }

  private doSearch(key: number, recorder: TraceRecorder, line: number): void {
    if (this.rootId === null) {
      recorder.record({
        type: "VISIT_NODE",
        title: `查找 ${key}：树为空`,
        description: "BST 为空，查找失败",
        codeLine: line,
        targets: [],
      });
      return;
    }

    let currentId: string | null = this.rootId;

    while (currentId !== null) {
      const current = this.getNode(currentId);

      recorder.record({
        type: "VISIT_NODE",
        title: `访问节点 ${current.key}`,
        description: `正在查找 ${key}，当前节点为 ${current.key}`,
        codeLine: line,
        targets: [currentId],
      });

      if (key === current.key) {
        recorder.record({
          type: "COMPARE",
          title: `找到 ${key}`,
          description: `${key} == ${current.key}，查找成功`,
          codeLine: line,
          targets: [currentId],
          payload: { found: true },
        });
        return;
      }

      const goLeft = key < current.key;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description: `${key} ${goLeft ? "<" : ">"} ${current.key}，${goLeft ? "向左子树查找" : "向右子树查找"}`,
        codeLine: line,
        targets: [currentId],
        payload: { direction: goLeft ? "left" : "right" },
      });

      currentId = goLeft ? current.left : current.right;
    }

    recorder.record({
      type: "VISIT_NODE",
      title: `查找 ${key}：未找到`,
      description: `${key} 不在 BST 中，查找失败`,
      codeLine: line,
      targets: [],
      payload: { found: false },
    });
  }

  private doDelete(key: number, recorder: TraceRecorder, line: number): void {
    if (this.rootId === null) {
      recorder.record({
        type: "VISIT_NODE",
        title: `删除 ${key}：树为空`,
        description: "BST 为空，无法删除",
        codeLine: line,
        targets: [],
      });
      return;
    }

    // ── 阶段1：沿路径搜索目标节点 ──
    let currentId: string | null = this.rootId;

    while (currentId !== null) {
      const current = this.getNode(currentId);

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description: `正在查找待删除节点 ${key}，当前节点为 ${current.key}`,
        codeLine: line,
        targets: [currentId],
      });

      if (key === current.key) {
        // 找到目标节点，执行删除
        recorder.record({
          type: "VISIT_NODE",
          title: `找到待删除节点 ${key}`,
          description: `${key} == ${current.key}，开始执行删除操作`,
          codeLine: line,
          targets: [currentId],
          payload: { found: true },
        });
        this.deleteNode(currentId, recorder, line);
        return;
      }

      const goLeft = key < current.key;
      recorder.record({
        type: "COMPARE",
        title: `${key} ${goLeft ? "<" : ">"} ${current.key}`,
        description: `${goLeft ? "向左子树查找" : "向右子树查找"}`,
        codeLine: line,
        targets: [currentId],
        payload: { direction: goLeft ? "left" : "right" },
      });

      currentId = goLeft ? current.left : current.right;
    }

    // 未找到
    recorder.record({
      type: "VISIT_NODE",
      title: `删除 ${key}：未找到`,
      description: `${key} 不在 BST 中，无法删除`,
      codeLine: line,
      targets: [],
      payload: { found: false },
    });
  }

  /** 删除指定节点（已确认存在于树中） */
  private deleteNode(nodeId: string, recorder: TraceRecorder, line: number): void {
    const node = this.getNode(nodeId);
    const hasLeft = node.left !== null;
    const hasRight = node.right !== null;

    // ── 情况1：叶子节点 → 直接删除 ──
    if (!hasLeft && !hasRight) {
      recorder.record({
        type: "COMPARE",
        title: `${node.key} 是叶子节点`,
        description: `节点 ${node.key} 没有子节点，直接删除`,
        codeLine: line,
        targets: [nodeId],
      });

      // 断开与父节点的连接
      if (node.parent !== null) {
        const parent = this.getNode(node.parent);
        recorder.record({
          type: "UNLINK_NODE",
          title: `断开 ${node.key} 与父节点 ${parent.key} 的连接`,
          description: `将父节点 ${parent.key} 的${parent.left === nodeId ? "左" : "右"}指针置空`,
          codeLine: line,
          targets: [node.parent, nodeId],
          payload: { direction: parent.left === nodeId ? "left" : "right" },
        });

        if (parent.left === nodeId) parent.left = null;
        else parent.right = null;
      } else {
        // 删除的是根节点
        recorder.record({
          type: "UNLINK_NODE",
          title: `${node.key} 是根节点，置空根指针`,
          description: `根节点 ${node.key} 被删除，树变为空`,
          codeLine: line,
          targets: [nodeId],
          payload: { role: "root" },
        });
        this.rootId = null;
      }

      // 从节点映射中移除
      this.nodes.delete(nodeId);
      recorder.record({
        type: "DELETE_NODE",
        title: `删除叶子节点 ${node.key}`,
        description: `节点 ${node.key} 已从树中移除`,
        codeLine: line,
        targets: [nodeId],
      });

      recorder.record({
        type: "MARK_FINAL",
        title: `删除完成`,
        description: `节点 ${node.key} 已成功删除`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    // ── 情况2：只有一个子节点 → 用子节点替换 ──
    if (hasLeft && !hasRight) {
      this.replaceWithChild(nodeId, "left", recorder, line);
      return;
    }
    if (!hasLeft && hasRight) {
      this.replaceWithChild(nodeId, "right", recorder, line);
      return;
    }

    // ── 情况3：有两个子节点 → 找后继节点替换 ──
    this.replaceWithSuccessor(nodeId, recorder, line);
  }

  /** 情况2：用唯一子节点替换被删除节点 */
  private replaceWithChild(
    nodeId: string,
    childDir: "left" | "right",
    recorder: TraceRecorder,
    line: number,
  ): void {
    const node = this.getNode(nodeId);
    const childId = childDir === "left" ? node.left! : node.right!;
    const child = this.getNode(childId);

    recorder.record({
      type: "COMPARE",
      title: `${node.key} 只有${childDir === "left" ? "左" : "右"}子节点 ${child.key}`,
      description: `节点 ${node.key} 只有一个子节点，用子节点 ${child.key} 替换`,
      codeLine: line,
      targets: [nodeId, childId],
    });

    // 断开 node 与父节点的连接
    recorder.record({
      type: "UNLINK_NODE",
      title: `断开 ${node.key} 与父节点的连接`,
      description: `准备将 ${child.key} 提升到 ${node.key} 的位置`,
      codeLine: line,
      targets: [nodeId],
    });

    // 更新父节点的指针
    if (node.parent !== null) {
      const parent = this.getNode(node.parent);
      if (parent.left === nodeId) parent.left = childId;
      else parent.right = childId;
    } else {
      this.rootId = childId;
    }

    // 更新子节点的 parent 指针
    child.parent = node.parent;

    recorder.record({
      type: "LINK_NODE",
      title: `${child.key} 替换 ${node.key}`,
      description: `将 ${child.key} 提升到 ${node.key} 的位置${node.parent !== null ? `，连接到父节点 ${this.getNode(node.parent).key}` : "，成为新的根节点"}`,
      codeLine: line,
      targets: [childId],
      payload: node.parent !== null ? { parentKey: this.getNode(node.parent).key } : { role: "root" },
    });

    // 从节点映射中移除
    this.nodes.delete(nodeId);
    recorder.record({
      type: "DELETE_NODE",
      title: `删除节点 ${node.key}`,
      description: `节点 ${node.key} 已被子节点 ${child.key} 替换并移除`,
      codeLine: line,
      targets: [nodeId],
    });

    recorder.record({
      type: "MARK_FINAL",
      title: `删除完成`,
      description: `节点 ${node.key} 已成功删除，${child.key} 已替换其位置`,
      codeLine: line,
      targets: [],
    });
  }

  /** 情况3：找后继节点（右子树最小值）替换，然后删除后继 */
  private replaceWithSuccessor(
    nodeId: string,
    recorder: TraceRecorder,
    line: number,
  ): void {
    const node = this.getNode(nodeId);

    recorder.record({
      type: "COMPARE",
      title: `${node.key} 有两个子节点`,
      description: `节点 ${node.key} 同时有左子树和右子树，需要找到后继节点（右子树最小值）来替换`,
      codeLine: line,
      targets: [nodeId],
    });

    // 在右子树中找最小值（后继节点）
    let successorId: string = node.right!;
    const successorCandidate = this.getNode(successorId);

    recorder.record({
      type: "VISIT_NODE",
      title: `进入右子树查找后继`,
      description: `从右子节点 ${successorCandidate.key} 开始，沿左子树向下查找最小值`,
      codeLine: line,
      targets: [successorId],
    });

    while (this.getNode(successorId).left !== null) {
      const current = this.getNode(successorId);
      successorId = current.left!;

      recorder.record({
        type: "VISIT_NODE",
        title: `访问左子节点 ${this.getNode(successorId).key}`,
        description: `继续沿左子树向下查找最小值`,
        codeLine: line,
        targets: [successorId],
      });
    }

    const successor = this.getNode(successorId);

    recorder.record({
      type: "COMPARE",
      title: `找到后继节点 ${successor.key}`,
      description: `后继节点是 ${successor.key}（右子树中的最小值），将用它替换 ${node.key}`,
      codeLine: line,
      targets: [successorId],
    });

    // 用后继节点的 key 替换当前节点的 key（而不是移动节点指针）
    const oldKey = node.key;
    node.key = successor.key;

    recorder.record({
      type: "LINK_NODE",
      title: `将 ${oldKey} 替换为 ${successor.key}`,
      description: `把后继节点 ${successor.key} 的值复制到待删除节点 ${oldKey} 的位置`,
      codeLine: line,
      targets: [nodeId],
      payload: { replacedKey: oldKey, newKey: successor.key },
    });

    // 删除后继节点（后继节点最多只有一个右子节点，不可能有左子节点）
    const succHasRight = successor.right !== null;

    if (!succHasRight) {
      // 后继是叶子节点，直接删除
      recorder.record({
        type: "COMPARE",
        title: `后继节点 ${successor.key} 是叶子节点`,
        description: `后继节点没有子节点，直接删除`,
        codeLine: line,
        targets: [successorId],
      });

      // 断开后继与其父节点的连接
      const succParentId = successor.parent;
      if (succParentId !== null) {
        const succParent = this.getNode(succParentId);
        recorder.record({
          type: "UNLINK_NODE",
          title: `断开后继节点 ${successor.key} 与父节点 ${succParent.key}`,
          description: `将父节点 ${succParent.key} 的${succParent.left === successorId ? "左" : "右"}指针置空`,
          codeLine: line,
          targets: [succParentId, successorId],
        });

        if (succParent.left === successorId) succParent.left = null;
        else succParent.right = null;
      }

      this.nodes.delete(successorId);
      recorder.record({
        type: "DELETE_NODE",
        title: `删除后继节点 ${successor.key}`,
        description: `后继节点 ${successor.key} 已从树中移除`,
        codeLine: line,
        targets: [successorId],
      });
    } else {
      // 后继有右子节点，用右子节点替换后继
      const rightChildId = successor.right!;
      const rightChild = this.getNode(rightChildId);

      recorder.record({
        type: "COMPARE",
        title: `后继节点 ${successor.key} 有右子节点 ${rightChild.key}`,
        description: `用右子节点 ${rightChild.key} 替换后继节点 ${successor.key}`,
        codeLine: line,
        targets: [successorId, rightChildId],
      });

      // 断开后继与父节点的连接
      const succParentId = successor.parent;
      if (succParentId !== null) {
        const succParent = this.getNode(succParentId);
        if (succParent.left === successorId) succParent.left = rightChildId;
        else succParent.right = rightChildId;
      }

      rightChild.parent = successor.parent;

      recorder.record({
        type: "LINK_NODE",
        title: `${rightChild.key} 替换后继 ${successor.key}`,
        description: `将 ${rightChild.key} 提升到后继节点 ${successor.key} 的位置`,
        codeLine: line,
        targets: [rightChildId],
      });

      this.nodes.delete(successorId);
      recorder.record({
        type: "DELETE_NODE",
        title: `删除后继节点 ${successor.key}`,
        description: `后继节点 ${successor.key} 已被替换并移除`,
        codeLine: line,
        targets: [successorId],
      });
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `删除完成`,
      description: `节点 ${oldKey} 已成功删除（由后继 ${successor.key} 替换）`,
      codeLine: line,
      targets: [],
    });
  }
}
