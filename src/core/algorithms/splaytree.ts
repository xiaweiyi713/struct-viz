import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── 内部节点结构 ──

interface SplayNode {
  id: string;
  key: number;
  left: string | null;
  right: string | null;
  parent: string | null;
}

// ── SplayTreeRuntime ──

export class SplayTreeRuntime implements StructureRuntime {
  private nodes = new Map<string, SplayNode>();
  private rootId: string | null = null;
  private idCounter = 0;

  // ── 工具方法 ──

  private nextId(): string {
    this.idCounter += 1;
    return `splay-node-${this.idCounter}`;
  }

  private getNode(id: string): SplayNode {
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
        throw new Error(`SplayTree 不支持方法 "${method}"`);
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

  // ── 旋转操作 ──

  /** 右旋：将以 pivotId 为根的子树右旋，返回提升的节点 id */
  private rightRotate(pivotId: string, _recorder: TraceRecorder, _line: number): string {
    const pivot = this.getNode(pivotId);
    const leftChildId = pivot.left!;
    const leftChild = this.getNode(leftChildId);

    // 将 leftChild 的右子树挂到 pivot 的左子树
    pivot.left = leftChild.right;
    if (leftChild.right !== null) {
      this.getNode(leftChild.right).parent = pivotId;
    }

    // 将 leftChild 接到 pivot 原来的父节点
    leftChild.parent = pivot.parent;
    if (pivot.parent === null) {
      this.rootId = leftChildId;
    } else {
      const pivotParent = this.getNode(pivot.parent);
      if (pivotParent.left === pivotId) {
        pivotParent.left = leftChildId;
      } else {
        pivotParent.right = leftChildId;
      }
    }

    // 将 pivot 挂为 leftChild 的右子节点
    leftChild.right = pivotId;
    pivot.parent = leftChildId;

    return leftChildId;
  }

  /** 左旋：将以 pivotId 为根的子树左旋，返回提升的节点 id */
  private leftRotate(pivotId: string, _recorder: TraceRecorder, _line: number): string {
    const pivot = this.getNode(pivotId);
    const rightChildId = pivot.right!;
    const rightChild = this.getNode(rightChildId);

    // 将 rightChild 的左子树挂到 pivot 的右子树
    pivot.right = rightChild.left;
    if (rightChild.left !== null) {
      this.getNode(rightChild.left).parent = pivotId;
    }

    // 将 rightChild 接到 pivot 原来的父节点
    rightChild.parent = pivot.parent;
    if (pivot.parent === null) {
      this.rootId = rightChildId;
    } else {
      const pivotParent = this.getNode(pivot.parent);
      if (pivotParent.left === pivotId) {
        pivotParent.left = rightChildId;
      } else {
        pivotParent.right = rightChildId;
      }
    }

    // 将 pivot 挂为 rightChild 的左子节点
    rightChild.left = pivotId;
    pivot.parent = rightChildId;

    return rightChildId;
  }

  // ── Splay 操作 ──

  /** 将节点 splay 到根 */
  private splay(nodeId: string, recorder: TraceRecorder, line: number, pseudo?: number): void {
    const node = this.getNode(nodeId);

    recorder.record({
      type: "VISIT_NODE",
      title: `开始 Splay 操作：将节点 ${node.key} 伸展到根`,
      description: `执行 Splay 操作，通过一系列旋转将节点 ${node.key} 移动到树的根节点位置`,
      codeLine: line,
      pseudoLine: pseudo,
      targets: [nodeId],
    });

    while (this.getNode(nodeId).parent !== null) {
      const current = this.getNode(nodeId);
      const parentId = current.parent!;
      const parent = this.getNode(parentId);

      if (parent.parent === null) {
        // 父节点是根 → 单旋 (zig 或 zag)
        if (parent.left === nodeId) {
          // node 是父的左子 → 右旋（zig）
          recorder.record({
            type: "ROTATE_RIGHT",
            title: `Zig 旋转`,
            description:
              `节点 ${current.key} 是根节点 ${parent.key} 的左子节点，执行右旋（Zig）。` +
              `节点 ${current.key} 被提升为新的根节点。`,
            codeLine: line,
            pseudoLine: pseudo,
            targets: [parentId, nodeId],
          });
          this.rightRotate(parentId, recorder, line);
        } else {
          // node 是父的右子 → 左旋（zag）
          recorder.record({
            type: "ROTATE_LEFT",
            title: `Zag 旋转`,
            description:
              `节点 ${current.key} 是根节点 ${parent.key} 的右子节点，执行左旋（Zag）。` +
              `节点 ${current.key} 被提升为新的根节点。`,
            codeLine: line,
            pseudoLine: pseudo,
            targets: [parentId, nodeId],
          });
          this.leftRotate(parentId, recorder, line);
        }
      } else {
        const grandparentId = parent.parent!;
        const grandparent = this.getNode(grandparentId);

        // 判断父节点在祖父节点的哪一侧
        const parentIsLeft = grandparent.left === parentId;
        // 判断当前节点在父节点的哪一侧
        const nodeIsLeft = parent.left === nodeId;

        if (parentIsLeft && nodeIsLeft) {
          // 同侧左-左 → Zig-Zig：先旋父，再旋自己
          recorder.record({
            type: "ROTATE_RIGHT",
            title: `Zig-Zig 旋转（同侧左-左）`,
            description:
              `节点 ${current.key}、父节点 ${parent.key}、祖父节点 ${grandparent.key} 在同一侧（左-左）。` +
              `执行 Zig-Zig：先对祖父节点 ${grandparent.key} 右旋（提升父节点 ${parent.key}），` +
              `再对新祖父节点右旋（提升节点 ${current.key}）。`,
            codeLine: line,
            pseudoLine: pseudo,
            targets: [grandparentId, parentId, nodeId],
          });
          this.rightRotate(grandparentId, recorder, line);
          this.rightRotate(parentId, recorder, line);
        } else if (!parentIsLeft && !nodeIsLeft) {
          // 同侧右-右 → Zag-Zag：先旋父，再旋自己
          recorder.record({
            type: "ROTATE_LEFT",
            title: `Zag-Zag 旋转（同侧右-右）`,
            description:
              `节点 ${current.key}、父节点 ${parent.key}、祖父节点 ${grandparent.key} 在同一侧（右-右）。` +
              `执行 Zag-Zag：先对祖父节点 ${grandparent.key} 左旋（提升父节点 ${parent.key}），` +
              `再对新祖父节点左旋（提升节点 ${current.key}）。`,
            codeLine: line,
            pseudoLine: pseudo,
            targets: [grandparentId, parentId, nodeId],
          });
          this.leftRotate(grandparentId, recorder, line);
          this.leftRotate(parentId, recorder, line);
        } else if (parentIsLeft && !nodeIsLeft) {
          // 异侧左-右 → Zig-Zag：连续两次单旋（先左旋父，再右旋祖父）
          recorder.record({
            type: "ROTATE_LEFT",
            title: `Zig-Zag 旋转（异侧左-右）`,
            description:
              `节点 ${current.key} 是父节点 ${parent.key} 的右子节点，` +
              `父节点 ${parent.key} 是祖父节点 ${grandparent.key} 的左子节点（异侧）。` +
              `执行 Zig-Zag：先对父节点 ${parent.key} 左旋，再对祖父节点 ${grandparent.key} 右旋。`,
            codeLine: line,
            pseudoLine: pseudo,
            targets: [grandparentId, parentId, nodeId],
          });
          this.leftRotate(parentId, recorder, line);
          this.rightRotate(grandparentId, recorder, line);
        } else {
          // 异侧右-左 → Zag-Zig：连续两次单旋（先右旋父，再左旋祖父）
          recorder.record({
            type: "ROTATE_RIGHT",
            title: `Zag-Zig 旋转（异侧右-左）`,
            description:
              `节点 ${current.key} 是父节点 ${parent.key} 的左子节点，` +
              `父节点 ${parent.key} 是祖父节点 ${grandparent.key} 的右子节点（异侧）。` +
              `执行 Zag-Zig：先对父节点 ${parent.key} 右旋，再对祖父节点 ${grandparent.key} 左旋。`,
            codeLine: line,
            pseudoLine: pseudo,
            targets: [grandparentId, parentId, nodeId],
          });
          this.rightRotate(parentId, recorder, line);
          this.leftRotate(grandparentId, recorder, line);
        }
      }
    }

    // splay 完成，记录结果
    const finalNode = this.getNode(nodeId);
    recorder.record({
      type: "VISIT_NODE",
      title: `Splay 完成：节点 ${finalNode.key} 已成为根`,
      description: `节点 ${finalNode.key} 已通过旋转操作移动到根节点位置`,
      codeLine: line,
      pseudoLine: pseudo,
      targets: [nodeId],
    });
  }

  // ── 插入操作 ──

  private doInsert(key: number, recorder: TraceRecorder, line: number): void {
    const id = this.nextId();
    const newNode: SplayNode = {
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
        pseudoLine: 2,
        targets: [id],
        payload: { role: "root" },
      });
      return;
    }

    // 2. 非空树：按 BST 方式找到插入位置
    let currentId: string | null = this.rootId;
    let insertParentId: string | null = null;
    let insertDirection: "left" | "right" = "left";

    while (currentId !== null) {
      const current = this.getNode(currentId);
      const goLeft = key < current.key;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description: `${key} ${goLeft ? "<" : ">="} ${current.key}，${goLeft ? "向左子树移动" : "向右子树移动"}`,
        codeLine: line,
        pseudoLine: 4,
        targets: [currentId],
        payload: { direction: goLeft ? "left" : "right" },
      });

      insertParentId = currentId;

      if (goLeft) {
        insertDirection = "left";
        currentId = current.left;
      } else {
        insertDirection = "right";
        currentId = current.right;
      }
    }

    // 3. 插入节点
    this.nodes.set(id, newNode);
    newNode.parent = insertParentId;
    const parent = this.getNode(insertParentId!);

    if (insertDirection === "left") {
      parent.left = id;
    } else {
      parent.right = id;
    }

    recorder.record({
      type: "LINK_NODE",
      title: `${key} 插入为 ${parent.key} 的${insertDirection === "left" ? "左" : "右"}子节点`,
      description: `找到插入位置：${key} ${insertDirection === "left" ? "<" : ">="} ${parent.key}，将 ${key} 挂载为${insertDirection === "left" ? "左" : "右"}子节点`,
      codeLine: line,
      pseudoLine: 6,
      targets: [insertParentId!, id],
      payload: { parentKey: parent.key, direction: insertDirection },
    });

    // 4. Splay 新插入的节点到根
    this.splay(id, recorder, line, 4);
  }

  // ── 查找操作 ──

  private doSearch(key: number, recorder: TraceRecorder, line: number): void {
    if (this.rootId === null) {
      recorder.record({
        type: "VISIT_NODE",
        title: `查找 ${key}：树为空`,
        description: "Splay 树为空，查找失败",
        codeLine: line,
        pseudoLine: 1,
        targets: [],
      });
      return;
    }

    let currentId: string | null = this.rootId;
    let lastAccessedId: string = this.rootId;

    while (currentId !== null) {
      const current = this.getNode(currentId);
      lastAccessedId = currentId;

      recorder.record({
        type: "VISIT_NODE",
        title: `访问节点 ${current.key}`,
        description: `正在查找 ${key}，当前节点为 ${current.key}`,
        codeLine: line,
        pseudoLine: 4,
        targets: [currentId],
      });

      if (key === current.key) {
        // 找到了
        recorder.record({
          type: "COMPARE",
          title: `找到 ${key}`,
          description: `${key} == ${current.key}，查找成功`,
          codeLine: line,
          pseudoLine: 5,
          targets: [currentId],
          payload: { found: true },
        });

        // Splay 找到的节点到根
        this.splay(currentId, recorder, line, 4);
        return;
      }

      const goLeft = key < current.key;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description: `${key} ${goLeft ? "<" : ">"} ${current.key}，${goLeft ? "向左子树查找" : "向右子树查找"}`,
        codeLine: line,
        pseudoLine: 4,
        targets: [currentId],
        payload: { direction: goLeft ? "left" : "right" },
      });

      currentId = goLeft ? current.left : current.right;
    }

    // 未找到：splay 最后访问的节点
    recorder.record({
      type: "VISIT_NODE",
      title: `查找 ${key}：未找到`,
      description: `${key} 不在 Splay 树中，查找失败。将对最后访问的节点执行 Splay 操作`,
      codeLine: line,
      pseudoLine: 4,
      targets: [lastAccessedId],
      payload: { found: false },
    });

    this.splay(lastAccessedId, recorder, line, 4);
  }

  // ── 删除操作 ──

  private doDelete(key: number, recorder: TraceRecorder, line: number): void {
    if (this.rootId === null) {
      recorder.record({
        type: "VISIT_NODE",
        title: `删除 ${key}：树为空`,
        description: "Splay 树为空，无法删除",
        codeLine: line,
        pseudoLine: 2,
        targets: [],
      });
      return;
    }

    // 1. 搜索要删除的节点
    let currentId: string | null = this.rootId;
    let lastAccessedId: string = this.rootId;
    let foundId: string | null = null;

    while (currentId !== null) {
      const current = this.getNode(currentId);
      lastAccessedId = currentId;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description: `正在查找 ${key}，当前节点为 ${current.key}`,
        codeLine: line,
        pseudoLine: 1,
        targets: [currentId],
      });

      if (key === current.key) {
        foundId = currentId;
        break;
      }

      const goLeft = key < current.key;
      currentId = goLeft ? current.left : current.right;
    }

    // 2. 未找到：splay 最后访问的节点
    if (foundId === null) {
      recorder.record({
        type: "VISIT_NODE",
        title: `删除 ${key}：未找到`,
        description: `${key} 不在 Splay 树中，删除失败。将对最后访问的节点执行 Splay 操作`,
        codeLine: line,
        pseudoLine: 2,
        targets: [lastAccessedId],
      });

      this.splay(lastAccessedId, recorder, line, 1);
      return;
    }

    // 3. 找到了：先 splay 该节点到根
    recorder.record({
      type: "VISIT_NODE",
      title: `找到 ${key}，准备删除`,
      description: `找到节点 ${key}，先将其 Splay 到根节点再执行删除`,
      codeLine: line,
      pseudoLine: 1,
      targets: [foundId],
    });

    this.splay(foundId, recorder, line, 1);

    // 此时 foundId 一定是根
    const root = this.getNode(foundId);

    recorder.record({
      type: "DELETE_NODE",
      title: `删除根节点 ${key}`,
      description: `节点 ${key} 已 Splay 到根，开始删除`,
      codeLine: line,
      pseudoLine: 3,
      targets: [foundId],
    });

    // 4. 删除根节点
    if (root.left === null) {
      // 没有左子树 → 右子树成为新根
      if (root.right !== null) {
        const rightChild = this.getNode(root.right);
        rightChild.parent = null;
        this.rootId = root.right;

        recorder.record({
          type: "LINK_NODE",
          title: `右子节点 ${rightChild.key} 成为新根`,
          description: `根节点 ${key} 没有左子树，右子节点 ${rightChild.key} 成为新的根节点`,
          codeLine: line,
          pseudoLine: 4,
          targets: [root.right],
          payload: { role: "root" },
        });
      } else {
        // 也没有右子树 → 树为空
        this.rootId = null;

        recorder.record({
          type: "UNLINK_NODE",
          title: `树已清空`,
          description: `根节点 ${key} 没有子节点，删除后树为空`,
          codeLine: line,
          pseudoLine: 4,
          targets: [foundId],
        });
      }
    } else if (root.right === null) {
      // 没有右子树 → 左子树成为新根
      const leftChild = this.getNode(root.left);
      leftChild.parent = null;
      this.rootId = root.left;

      recorder.record({
        type: "LINK_NODE",
        title: `左子节点 ${leftChild.key} 成为新根`,
        description: `根节点 ${key} 没有右子树，左子节点 ${leftChild.key} 成为新的根节点`,
        codeLine: line,
        pseudoLine: 8,
        targets: [root.left],
        payload: { role: "root" },
      });
    } else {
      // 两个子树都存在：
      // a. 找左子树的最大节点
      let maxLeftId: string = root.left;
      while (true) {
        const node = this.getNode(maxLeftId);
        if (node.right === null) break;
        maxLeftId = node.right;
      }

      recorder.record({
        type: "VISIT_NODE",
        title: `找左子树最大节点 ${this.getNode(maxLeftId).key}`,
        description: `根节点 ${key} 有两棵子树，在左子树中查找最大节点作为前驱`,
        codeLine: line,
        pseudoLine: 6,
        targets: [maxLeftId],
      });

      // b. Splay 左子树最大节点到左子树的根（即断开左子树与根的连接后 splay）
      // 先断开左子树与根的父子关系
      const leftSubtreeRoot = root.left;
      this.getNode(leftSubtreeRoot).parent = null;

      // splay 左子树的最大节点
      this.splay(maxLeftId, recorder, line, 6);

      // 此时 maxLeftId 已成为左子树的根，且它没有右子节点（因为它原本就是最大节点）
      // c. 将右子树挂为新左子树根的右子节点
      const newRoot = this.getNode(maxLeftId);
      const rightSubtreeRoot = root.right;
      newRoot.right = rightSubtreeRoot;
      this.getNode(rightSubtreeRoot).parent = maxLeftId;
      this.rootId = maxLeftId;

      recorder.record({
        type: "LINK_NODE",
        title: `${newRoot.key} 成为新根，挂载右子树`,
        description: `前驱节点 ${newRoot.key} 成为新的根节点，将原右子树挂为其右子树`,
        codeLine: line,
        pseudoLine: 7,
        targets: [maxLeftId, rightSubtreeRoot],
        payload: { role: "root" },
      });
    }

    // 从节点集合中移除
    this.nodes.delete(foundId);

    recorder.record({
      type: "MARK_FINAL",
      title: `删除 ${key} 完成`,
      description: `节点 ${key} 已成功删除，树中共 ${this.nodes.size} 个节点`,
      codeLine: line,
      pseudoLine: 8,
      targets: this.rootId ? [this.rootId] : [],
    });
  }
}
