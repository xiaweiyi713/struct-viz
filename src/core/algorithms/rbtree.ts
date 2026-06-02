import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── 内部节点结构 ──

interface RBNode {
  id: string;
  key: number;
  color: "red" | "black";
  left: string | null;
  right: string | null;
  parent: string | null;
  pending?: boolean;
}

// ── 辅助：NIL 哨兵 ──

const NIL_ID = "rb-nil";

// ── RBTreeRuntime ──

export class RBTreeRuntime implements StructureRuntime {
  private nodes = new Map<string, RBNode>();
  private nil: RBNode;
  private rootId: string | null = null;
  private idCounter = 0;

  constructor() {
    // NIL 哨兵节点：黑色，无有效 key
    this.nil = {
      id: NIL_ID,
      key: Number.NEGATIVE_INFINITY,
      color: "black",
      left: null,
      right: null,
      parent: null,
    };
    this.nodes.set(NIL_ID, this.nil);
  }

  // ── 工具方法 ──

  private nextId(): string {
    this.idCounter += 1;
    return `rb-node-${this.idCounter}`;
  }

  private getNode(id: string): RBNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`节点 ${id} 不存在`);
    return node;
  }

  /** 获取节点的父节点 ID（无则为 NIL） */
  private parentOf(id: string): string {
    const node = this.getNode(id);
    return node.parent ?? NIL_ID;
  }

  /** 判断节点是否为 NIL 哨兵 */
  private isNilNode(id: string): boolean {
    return id === NIL_ID;
  }

  /** 设置节点的父节点 */
  private setParent(childId: string, parentId: string | null): void {
    const child = this.getNode(childId);
    child.parent = parentId;
  }

  /** 计算树高（只计内部节点，不含 NIL） */
  private treeHeight(): number {
    if (this.rootId === null) return 0;
    const height = (id: string): number => {
      if (this.isNilNode(id)) return 0;
      const node = this.getNode(id);
      return 1 + Math.max(height(node.left ?? NIL_ID), height(node.right ?? NIL_ID));
    };
    return height(this.rootId);
  }

  /** 将内部节点转换为可视化节点（不包含 NIL 哨兵） */
  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      if (this.isNilNode(id)) continue;
      result[id] = {
        id,
        key: node.key,
        color: node.color,
        left: this.isNilNode(node.left ?? NIL_ID) ? null : node.left,
        right: this.isNilNode(node.right ?? NIL_ID) ? null : node.right,
        parent: this.isNilNode(node.parent ?? NIL_ID) ? null : node.parent,
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
      case "delete":
        this.doDelete(Number(args[0]), recorder, line);
        break;
      case "search":
        this.doSearch(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`RBTree 不支持方法 "${method}"`);
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
    const internalCount = this.nodes.size - 1; // 减去 NIL 哨兵

    return {
      nodeCount: {
        type: "number",
        value: internalCount,
        display: `${internalCount}`,
      },
      root: rootNode
        ? { type: "node", value: this.rootId, display: `Node(${rootNode.key}, ${rootNode.color})` }
        : { type: "null", value: null, display: "null" },
      height: {
        type: "number",
        value: this.treeHeight(),
        display: `${this.treeHeight()}`,
      },
    };
  }

  // ── 旋转操作 ──

  private leftRotate(xId: string, recorder: TraceRecorder, line: number): void {
    const x = this.getNode(xId);
    const yId = x.right!;
    const y = this.getNode(yId);

    // 将 y 的左子树挂到 x 的右子树
    x.right = y.left;
    if (y.left !== null && !this.isNilNode(y.left)) {
      this.setParent(y.left, xId);
    }

    // 将 y 接到 x 原来的父节点
    y.parent = x.parent;
    if (x.parent === null || this.isNilNode(x.parent)) {
      this.rootId = yId;
    } else {
      const xParent = this.getNode(x.parent);
      if (xParent.left === xId) {
        xParent.left = yId;
      } else {
        xParent.right = yId;
      }
    }

    // 将 x 挂为 y 的左子节点
    y.left = xId;
    x.parent = yId;

    recorder.record({
      type: "ROTATE_LEFT",
      title: `对节点 ${x.key} 执行左旋`,
      description:
        `左旋操作：将节点 ${x.key} 的右子节点 ${y.key} 提升为父节点，` +
        `节点 ${x.key} 降为 ${y.key} 的左子节点。` +
        `${y.key} 原来的左子树转移为 ${x.key} 的右子树。`,
      codeLine: line,
      targets: [xId, yId],
      payload: { pivot: xId, direction: "left" },
    });
  }

  private rightRotate(yId: string, recorder: TraceRecorder, line: number): void {
    const y = this.getNode(yId);
    const xId = y.left!;
    const x = this.getNode(xId);

    // 将 x 的右子树挂到 y 的左子树
    y.left = x.right;
    if (x.right !== null && !this.isNilNode(x.right)) {
      this.setParent(x.right, yId);
    }

    // 将 x 接到 y 原来的父节点
    x.parent = y.parent;
    if (y.parent === null || this.isNilNode(y.parent)) {
      this.rootId = xId;
    } else {
      const yParent = this.getNode(y.parent);
      if (yParent.left === yId) {
        yParent.left = xId;
      } else {
        yParent.right = xId;
      }
    }

    // 将 y 挂为 x 的右子节点
    x.right = yId;
    y.parent = xId;

    recorder.record({
      type: "ROTATE_RIGHT",
      title: `对节点 ${y.key} 执行右旋`,
      description:
        `右旋操作：将节点 ${y.key} 的左子节点 ${x.key} 提升为父节点，` +
        `节点 ${y.key} 降为 ${x.key} 的右子节点。` +
        `${x.key} 原来的右子树转移为 ${y.key} 的左子树。`,
      codeLine: line,
      targets: [yId, xId],
      payload: { pivot: yId, direction: "right" },
    });
  }

  // ── 插入修复 ──

  private insertFixup(zId: string, recorder: TraceRecorder, line: number): void {
    let z = this.getNode(zId);
    let currentZId = zId;

    while (true) {
      const parentId = this.parentOf(currentZId);
      if (this.isNilNode(parentId)) break;
      const parent = this.getNode(parentId);
      if (parent.color !== "red") break;

      const grandparentId = this.parentOf(parentId);
      if (this.isNilNode(grandparentId)) break;
      const grandparent = this.getNode(grandparentId);

      recorder.record({
        type: "CHECK_INVARIANT",
        title: "检查红黑树性质 4",
        description:
          `节点 ${z.key}（红色）的父节点 ${parent.key} 也是红色，` +
          `违反红黑树性质 4：红色节点不能有红色孩子。需要修复。`,
        codeLine: line,
        targets: [currentZId, parentId],
      });

      if (parentId === grandparent.left) {
        // 父节点是祖父的左子节点
        const uncleId = grandparent.right ?? NIL_ID;
        const uncleIsRed = !this.isNilNode(uncleId) && this.getNode(uncleId).color === "red";

        if (uncleIsRed) {
          // Case 1：叔叔为红色
          const uncle = this.getNode(uncleId);

          parent.color = "black";
          uncle.color = "black";
          grandparent.color = "red";

          recorder.record({
            type: "RECOLOR",
            title: "Case 1：叔叔为红色，重新染色",
            description:
              `叔叔节点 ${uncle.key} 为红色，执行 Case 1 修复：` +
              `将父节点 ${parent.key} 和叔叔节点 ${uncle.key} 染为黑色，` +
              `祖父节点 ${grandparent.key} 染为红色。` +
              `然后将 z 上移到祖父节点，继续检查。`,
            codeLine: line,
            targets: [parentId, uncleId, grandparentId],
            payload: { recolors: [
              { node: parentId, from: "red", to: "black" },
              { node: uncleId, from: "red", to: "black" },
              { node: grandparentId, from: "black", to: "red" },
            ] },
          });

          currentZId = grandparentId;
          z = grandparent;
        } else {
          // Case 2 & 3：叔叔为黑色
          if (currentZId === parent.right) {
            // Case 2：z 是右子节点，先左旋转化为 Case 3
            recorder.record({
              type: "RECOLOR",
              title: "Case 2：z 是右子节点（LR 型），先左旋",
              description:
                `叔叔节点为黑色，且节点 ${z.key} 是父节点 ${parent.key} 的右子节点（LR 型）。` +
                `先对父节点 ${parent.key} 左旋，转化为 Case 3（LL 型）。`,
              codeLine: line,
              targets: [parentId, currentZId],
            });

            currentZId = parentId;
            this.leftRotate(currentZId, recorder, line);

            // 旋转后重新获取引用
            const newParentId = this.parentOf(currentZId);
            const newGrandparentId = this.parentOf(newParentId);

            // 走到 Case 3
            this.fixupCase3(currentZId, newParentId, newGrandparentId, recorder, line);
            return;
          }

          // Case 3：z 是左子节点（LL 型）
          const gpId = this.parentOf(this.parentOf(currentZId));
          this.fixupCase3(currentZId, this.parentOf(currentZId), gpId, recorder, line);
          return;
        }
      } else {
        // 对称情况：父节点是祖父的右子节点
        const uncleId = grandparent.left ?? NIL_ID;
        const uncleIsRed = !this.isNilNode(uncleId) && this.getNode(uncleId).color === "red";

        if (uncleIsRed) {
          // Case 1 对称：叔叔为红色
          const uncle = this.getNode(uncleId);

          parent.color = "black";
          uncle.color = "black";
          grandparent.color = "red";

          recorder.record({
            type: "RECOLOR",
            title: "Case 1（对称）：叔叔为红色，重新染色",
            description:
              `叔叔节点 ${uncle.key} 为红色，执行 Case 1 修复：` +
              `将父节点 ${parent.key} 和叔叔节点 ${uncle.key} 染为黑色，` +
              `祖父节点 ${grandparent.key} 染为红色。` +
              `然后将 z 上移到祖父节点，继续检查。`,
            codeLine: line,
            targets: [parentId, uncleId, grandparentId],
            payload: { recolors: [
              { node: parentId, from: "red", to: "black" },
              { node: uncleId, from: "red", to: "black" },
              { node: grandparentId, from: "black", to: "red" },
            ] },
          });

          currentZId = grandparentId;
          z = grandparent;
        } else {
          // Case 2 & 3 对称
          if (currentZId === parent.left) {
            // Case 2 对称：z 是左子节点（RL 型），先右旋
            recorder.record({
              type: "RECOLOR",
              title: "Case 2（对称）：z 是左子节点（RL 型），先右旋",
              description:
                `叔叔节点为黑色，且节点 ${z.key} 是父节点 ${parent.key} 的左子节点（RL 型）。` +
                `先对父节点 ${parent.key} 右旋，转化为 Case 3（RR 型）。`,
              codeLine: line,
              targets: [parentId, currentZId],
            });

            currentZId = parentId;
            this.rightRotate(currentZId, recorder, line);

            // 旋转后重新获取引用
            const newParentId = this.parentOf(currentZId);
            const newGrandparentId = this.parentOf(newParentId);

            // 走到 Case 3 对称
            this.fixupCase3Symmetric(currentZId, newParentId, newGrandparentId, recorder, line);
            return;
          }

          // Case 3 对称：z 是右子节点（RR 型）
          const gpId = this.parentOf(this.parentOf(currentZId));
          this.fixupCase3Symmetric(currentZId, this.parentOf(currentZId), gpId, recorder, line);
          return;
        }
      }
    }

    // 确保根节点为黑色
    if (this.rootId !== null) {
      const root = this.getNode(this.rootId);
      if (root.color === "red") {
        const oldColor = root.color;
        root.color = "black";

        recorder.record({
          type: "RECOLOR",
          title: `根节点 ${root.key} 染为黑色`,
          description:
            `确保红黑树性质 2：根节点必须为黑色。将根节点 ${root.key} 从红色染为黑色。`,
          codeLine: line,
          targets: [this.rootId],
          payload: { node: this.rootId, from: oldColor, to: "black" },
        });
      }
    }
  }

  /** Case 3：LL 型 — 父节点染黑，祖父节点染红，对祖父右旋 */
  private fixupCase3(
    _zId: string,
    parentId: string,
    grandparentId: string,
    recorder: TraceRecorder,
    line: number,
  ): void {
    if (this.isNilNode(parentId) || this.isNilNode(grandparentId)) return;

    const parent = this.getNode(parentId);
    const grandparent = this.getNode(grandparentId);

    parent.color = "black";
    grandparent.color = "red";

    recorder.record({
      type: "RECOLOR",
      title: "Case 3：LL 型，染色并右旋",
      description:
        `叔叔节点为黑色，且为 LL 型（左-左）。执行 Case 3 修复：` +
        `将父节点 ${parent.key} 染为黑色，祖父节点 ${grandparent.key} 染为红色，` +
        `然后对祖父节点 ${grandparent.key} 右旋。修复完成。`,
      codeLine: line,
      targets: [parentId, grandparentId],
      payload: { recolors: [
        { node: parentId, from: "red", to: "black" },
        { node: grandparentId, from: "black", to: "red" },
      ] },
    });

    this.rightRotate(grandparentId, recorder, line);

    // 最后确保根为黑色
    this.ensureRootBlack(recorder, line);
  }

  /** Case 3 对称：RR 型 — 父节点染黑，祖父节点染红，对祖父左旋 */
  private fixupCase3Symmetric(
    _zId: string,
    parentId: string,
    grandparentId: string,
    recorder: TraceRecorder,
    line: number,
  ): void {
    if (this.isNilNode(parentId) || this.isNilNode(grandparentId)) return;

    const parent = this.getNode(parentId);
    const grandparent = this.getNode(grandparentId);

    parent.color = "black";
    grandparent.color = "red";

    recorder.record({
      type: "RECOLOR",
      title: "Case 3（对称）：RR 型，染色并左旋",
      description:
        `叔叔节点为黑色，且为 RR 型（右-右）。执行 Case 3 修复：` +
        `将父节点 ${parent.key} 染为黑色，祖父节点 ${grandparent.key} 染为红色，` +
        `然后对祖父节点 ${grandparent.key} 左旋。修复完成。`,
      codeLine: line,
      targets: [parentId, grandparentId],
      payload: { recolors: [
        { node: parentId, from: "red", to: "black" },
        { node: grandparentId, from: "black", to: "red" },
      ] },
    });

    this.leftRotate(grandparentId, recorder, line);

    // 最后确保根为黑色
    this.ensureRootBlack(recorder, line);
  }

  /** 确保根节点为黑色（修复完成后调用） */
  private ensureRootBlack(recorder: TraceRecorder, line: number): void {
    if (this.rootId !== null) {
      const root = this.getNode(this.rootId);
      if (root.color === "red") {
        root.color = "black";
        recorder.record({
          type: "RECOLOR",
          title: `根节点 ${root.key} 染为黑色`,
          description:
            `确保红黑树性质 2：根节点必须为黑色。将根节点 ${root.key} 从红色染为黑色。`,
          codeLine: line,
          targets: [this.rootId],
          payload: { node: this.rootId, from: "red", to: "black" },
        });
      }
    }
  }

  // ── 红黑树插入 ──

  private doInsert(key: number, recorder: TraceRecorder, line: number): void {
    const id = this.nextId();
    const newNode: RBNode = {
      id,
      key,
      color: "red",
      left: null,
      right: null,
      parent: null,
    };

    // 1. 空树：直接设为根，并染为黑色
    if (this.rootId === null) {
      this.nodes.set(id, newNode);
      this.rootId = id;

      recorder.record({
        type: "LINK_NODE",
        title: `${key} 设为根节点`,
        description: `树为空，将 ${key} 直接设为根节点。`,
        codeLine: line,
        targets: [id],
        payload: { role: "root" },
      });

      // 根节点必须为黑色
      newNode.color = "black";
      recorder.record({
        type: "RECOLOR",
        title: `根节点 ${key} 染为黑色`,
        description:
          `红黑树性质 2：根节点必须为黑色。将根节点 ${key} 从红色染为黑色。`,
        codeLine: line,
        targets: [id],
        payload: { node: id, from: "red", to: "black" },
      });

      return;
    }

    // 2. BST 插入：沿路径比较找到插入位置
    let currentId: string | null = this.rootId;

    while (currentId !== null) {
      const current = this.getNode(currentId);

      const goLeft = key < current.key;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description:
          `${key} ${goLeft ? "<" : ">="} ${current.key}，` +
          `${goLeft ? "向左子树移动" : "向右子树移动"}`,
        codeLine: line,
        targets: [currentId],
        payload: { direction: goLeft ? "left" : "right" },
      });

      if (goLeft) {
        if (current.left === null || this.isNilNode(current.left)) {
          // 第一步：新节点待命（已创建为红色，尚未接入树，显示在树上方待命区）
          newNode.pending = true;
          this.nodes.set(id, newNode);
          recorder.record({
            type: "CREATE_NODE",
            title: `创建新节点 ${key}（待插入，红色）`,
            description:
              `找到插入位置：${key} < ${current.key} 且 ${current.key} 左子树为空。` +
              `新节点 ${key}（红色）已创建并在一旁待命，下一步接入树。`,
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
            description: `将待命的新节点 ${key} 挂载为 ${current.key} 的左子节点（红色）。`,
            codeLine: line,
            targets: [currentId, id],
            payload: { parentKey: current.key, direction: "left" },
          });
          break;
        }
        currentId = current.left;
      } else {
        if (current.right === null || this.isNilNode(current.right)) {
          // 第一步：新节点待命（已创建为红色，尚未接入树，显示在树上方待命区）
          newNode.pending = true;
          this.nodes.set(id, newNode);
          recorder.record({
            type: "CREATE_NODE",
            title: `创建新节点 ${key}（待插入，红色）`,
            description:
              `找到插入位置：${key} >= ${current.key} 且 ${current.key} 右子树为空。` +
              `新节点 ${key}（红色）已创建并在一旁待命，下一步接入树。`,
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
            description: `将待命的新节点 ${key} 挂载为 ${current.key} 的右子节点（红色）。`,
            codeLine: line,
            targets: [currentId, id],
            payload: { parentKey: current.key, direction: "right" },
          });
          break;
        }
        currentId = current.right;
      }
    }

    // 3. 插入修复
    this.insertFixup(id, recorder, line);
  }

  // ── 查找 ──

  private doSearch(key: number, recorder: TraceRecorder, line: number): void {
    if (this.rootId === null) {
      recorder.record({
        type: "VISIT_NODE",
        title: `查找 ${key}：树为空`,
        description: "红黑树为空，查找失败",
        codeLine: line,
        targets: [],
      });
      return;
    }

    let currentId: string | null = this.rootId;

    while (currentId !== null && !this.isNilNode(currentId)) {
      const current = this.getNode(currentId);

      recorder.record({
        type: "VISIT_NODE",
        title: `访问节点 ${current.key}`,
        description: `正在查找 ${key}，当前节点为 ${current.key}（${current.color}）`,
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
      description: `${key} 不在红黑树中，查找失败`,
      codeLine: line,
      targets: [],
      payload: { found: false },
    });
  }

  // ── 辅助：子树最小值 ──

  private treeMinimum(id: string): string {
    let currentId = id;
    while (true) {
      const node = this.getNode(currentId);
      if (node.left === null || this.isNilNode(node.left)) break;
      currentId = node.left;
    }
    return currentId;
  }

  // ── 辅助：替换子树（transplant） ──

  /** 将子树 u 替换为子树 v（仅修改 u 的父节点指向） */
  private transplant(uId: string, vId: string, _recorder: TraceRecorder, _line: number): void {
    const u = this.getNode(uId);
    const v = this.getNode(vId);

    if (u.parent === null || this.isNilNode(u.parent)) {
      this.rootId = vId;
    } else {
      const uParent = this.getNode(u.parent);
      if (uParent.left === uId) {
        uParent.left = vId;
      } else {
        uParent.right = vId;
      }
    }
    v.parent = u.parent;
  }

  // ── 红黑树删除 ──

  private doDelete(key: number, recorder: TraceRecorder, line: number): void {
    // 1. BST 查找要删除的节点 z
    if (this.rootId === null) {
      recorder.record({
        type: "COMPARE",
        title: `查找 ${key}`,
        description: `树为空，无法删除 ${key}。`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    let zId: string | null = null;
    let currentId: string | null = this.rootId;

    while (currentId !== null && !this.isNilNode(currentId)) {
      const current = this.getNode(currentId);

      const goLeft = key < current.key;
      const isEqual = key === current.key;

      if (isEqual) {
        recorder.record({
          type: "COMPARE",
          title: `比较 ${key} 与 ${current.key}`,
          description: `${key} === ${current.key}，找到目标节点。`,
          codeLine: line,
          targets: [currentId],
        });
        zId = currentId;
        break;
      }

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description:
          `${key} ${goLeft ? "<" : ">"} ${current.key}，` +
          `${goLeft ? "向左子树移动" : "向右子树移动"}`,
        codeLine: line,
        targets: [currentId],
        payload: { direction: goLeft ? "left" : "right" },
      });

      if (goLeft) {
        if (current.left === null || this.isNilNode(current.left)) {
          recorder.record({
            type: "COMPARE",
            title: `查找结束`,
            description: `${key} 不在树中，无法删除。`,
            codeLine: line,
            targets: [],
          });
          return;
        }
        currentId = current.left;
      } else {
        if (current.right === null || this.isNilNode(current.right)) {
          recorder.record({
            type: "COMPARE",
            title: `查找结束`,
            description: `${key} 不在树中，无法删除。`,
            codeLine: line,
            targets: [],
          });
          return;
        }
        currentId = current.right;
      }
    }

    if (zId === null) {
      return;
    }

    const z = this.getNode(zId);
    let yOriginalColor = z.color;
    let xId: string;

    const zLeftIsNil = z.left === null || this.isNilNode(z.left ?? NIL_ID);
    const zRightIsNil = z.right === null || this.isNilNode(z.right ?? NIL_ID);

    if (zLeftIsNil) {
      // 左子树为空，用右子树替换 z
      xId = z.right ?? NIL_ID;
      recorder.record({
        type: "UNLINK_NODE",
        title: `节点 ${z.key} 最多有一个子节点`,
        description:
          `节点 ${z.key}（${z.color}）的左子树为空，` +
          `将用其右子树替换它的位置。`,
        codeLine: line,
        targets: [zId],
      });
      this.transplant(zId, xId, recorder, line);
    } else if (zRightIsNil) {
      // 右子树为空，用左子树替换 z
      xId = z.left ?? NIL_ID;
      recorder.record({
        type: "UNLINK_NODE",
        title: `节点 ${z.key} 最多有一个子节点`,
        description:
          `节点 ${z.key}（${z.color}）的右子树为空，` +
          `将用其左子树替换它的位置。`,
        codeLine: line,
        targets: [zId],
      });
      this.transplant(zId, xId, recorder, line);
    } else {
      // z 有两个子节点：找后继 y（右子树最小值）
      const yId = this.treeMinimum(z.right ?? NIL_ID);
      const y = this.getNode(yId);
      yOriginalColor = y.color;
      xId = y.right ?? NIL_ID;

      recorder.record({
        type: "VISIT_NODE",
        title: `找到后继节点 ${y.key}`,
        description:
          `节点 ${z.key} 有两个子节点，在右子树中找到最小值（后继）${y.key}（${y.color}）` +
          `来替代 ${z.key} 的位置。`,
        codeLine: line,
        targets: [yId],
      });

      if (y.parent === zId) {
        // y 是 z 的直接右子节点
        // x 的父节点设为 y（y 即将上移）
        if (!this.isNilNode(xId)) {
          this.setParent(xId, yId);
        }
      } else {
        // y 不是 z 的直接右子节点
        // 先用 y 的右子树替换 y
        recorder.record({
          type: "UNLINK_NODE",
          title: `用后继 ${y.key} 的右子树替换 ${y.key}`,
          description:
            `后继节点 ${y.key} 不是 ${z.key} 的直接子节点，` +
            `先将 ${y.key} 的右子树替换 ${y.key} 的位置。`,
          codeLine: line,
          targets: [yId],
        });
        this.transplant(yId, xId, recorder, line);
        // 将 y 移到 z 的位置
        const yNode = this.getNode(yId);
        yNode.right = z.right;
        this.setParent(z.right ?? NIL_ID, yId);
      }

      // 用 y 替换 z
      this.transplant(zId, yId, recorder, line);
      const yNode = this.getNode(yId);
      yNode.left = z.left;
      this.setParent(z.left ?? NIL_ID, yId);
      yNode.color = z.color;

      recorder.record({
        type: "LINK_NODE",
        title: `后继 ${yNode.key} 替代 ${z.key} 的位置`,
        description:
          `将后继节点 ${yNode.key} 移到 ${z.key} 的位置，` +
          `继承 ${z.key} 的左右子树和颜色（${z.color}）。`,
        codeLine: line,
        targets: [yId],
      });

      // 如果 y 的颜色发生了变化，记录变色
      if (yOriginalColor !== z.color) {
        recorder.record({
          type: "RECOLOR",
          title: `后继节点 ${yNode.key} 继承颜色`,
          description:
            `后继节点 ${yNode.key} 从 ${yOriginalColor} 变为 ${z.color}，` +
            `继承被删除节点 ${z.key} 的颜色。`,
          codeLine: line,
          targets: [yId],
          payload: { recolors: [
            { node: yId, from: yOriginalColor, to: z.color },
          ] },
        });
      }
    }

    // 删除节点 z
    recorder.record({
      type: "DELETE_NODE",
      title: `删除节点 ${z.key}`,
      description: `节点 ${z.key} 已从树中移除。`,
      codeLine: line,
      targets: [zId],
      payload: { key: z.key, color: z.color },
    });
    this.nodes.delete(zId);

    // 如果实际被移除的节点是黑色，需要修复
    if (yOriginalColor === "black") {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: "被移除节点为黑色，需要修复",
        description:
          `实际被移除的节点（后继）原色为黑色，删除可能导致黑高不平衡。` +
          `需要对替换节点执行 deleteFixup 修复。`,
        codeLine: line,
        targets: [xId],
      });
      this.deleteFixup(xId, recorder, line);
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `删除 ${key} 完成`,
      description: `红黑树删除操作完成，树性质已恢复。`,
      codeLine: line,
      targets: [],
    });
  }

  // ── 删除修复 ──

  private deleteFixup(xId: string, recorder: TraceRecorder, line: number): void {
    let currentXId = xId;

    while (true) {
      // x 到达根节点时退出
      if (currentXId === this.rootId) break;
      // 树为空时退出
      if (this.rootId === null) break;

      // 判断 x 是否为黑色（NIL 节点视为黑色）
      const xIsBlack = this.isNilNode(currentXId) || this.getNode(currentXId).color === "black";
      if (!xIsBlack) break;

      // 获取 x 的父节点
      const xParentId = this.parentOf(currentXId);
      if (this.isNilNode(xParentId)) break;
      const xParent = this.getNode(xParentId);

      if (currentXId === xParent.left) {
        // x 是左子节点
        let wId = xParent.right ?? NIL_ID;
        let w = this.getNode(wId);

        // Case 1: x 的兄弟 w 是红色
        if (!this.isNilNode(wId) && w.color === "red") {
          const oldWColor = w.color;
          const oldParentColor = xParent.color;
          w.color = "black";
          xParent.color = "red";

          recorder.record({
            type: "RECOLOR",
            title: "Delete Case 1：兄弟节点为红色",
            description:
              `节点 ${this.isNilNode(currentXId) ? "NIL" : this.getNode(currentXId).key} 的兄弟 ` +
              `${w.key} 为红色。` +
              `将兄弟 ${w.key} 染为黑色，父节点 ${xParent.key} 染为红色，` +
              `然后对父节点 ${xParent.key} 左旋。`,
            codeLine: line,
            targets: [wId, xParentId],
            payload: { recolors: [
              { node: wId, from: oldWColor, to: "black" },
              { node: xParentId, from: oldParentColor, to: "red" },
            ] },
          });

          this.leftRotate(xParentId, recorder, line);

          // 更新兄弟
          wId = xParent.right ?? NIL_ID;
          w = this.getNode(wId);
        }

        // Case 2: w 是黑色，w 的两个子节点都是黑色
        const wLeft = w.left ?? NIL_ID;
        const wRight = w.right ?? NIL_ID;
        const wLeftBlack = this.isNilNode(wLeft) || this.getNode(wLeft).color === "black";
        const wRightBlack = this.isNilNode(wRight) || this.getNode(wRight).color === "black";

        if (wLeftBlack && wRightBlack) {
          const oldWColor = w.color;
          w.color = "red";

          recorder.record({
            type: "RECOLOR",
            title: "Delete Case 2：兄弟的两个子节点均为黑色",
            description:
              `兄弟节点 ${this.isNilNode(wId) ? "NIL" : w.key} 的两个子节点均为黑色（或 NIL）。` +
              `将兄弟 ${this.isNilNode(wId) ? "NIL" : w.key} 染为红色，` +
              `然后将 x 上移到父节点 ${xParent.key}。`,
            codeLine: line,
            targets: [wId, xParentId],
            payload: { recolors: [
              { node: wId, from: oldWColor, to: "red" },
            ] },
          });

          currentXId = xParentId;
          continue;
        }

        // Case 3: w 是黑色，w 的左子红色，右子黑色
        if (wRightBlack) {
          const wLeftNode = this.isNilNode(wLeft) ? null : this.getNode(wLeft);
          const oldWColor = w.color;
          const oldWLeftColor = wLeftNode ? wLeftNode.color : "black" as const;

          if (wLeftNode) {
            wLeftNode.color = "black";
          }
          w.color = "red";

          recorder.record({
            type: "RECOLOR",
            title: "Delete Case 3：兄弟的左子红色，右子黑色",
            description:
              `兄弟节点 ${w.key} 的左子节点 ${wLeftNode ? wLeftNode.key : "NIL"} 为红色，` +
              `右子节点为黑色。` +
              `将兄弟 ${w.key} 染为红色，兄弟的左子 ${wLeftNode ? wLeftNode.key : "NIL"} 染为黑色，` +
              `然后对兄弟 ${w.key} 右旋，转化为 Case 4。`,
            codeLine: line,
            targets: [wId, wLeft],
            payload: { recolors: [
              { node: wId, from: oldWColor, to: "red" },
              ...(wLeftNode ? [{ node: wLeft, from: oldWLeftColor, to: "black" as const }] : []),
            ] },
          });

          this.rightRotate(wId, recorder, line);

          // 更新兄弟
          wId = xParent.right ?? NIL_ID;
          w = this.getNode(wId);
        }

        // Case 4: w 是黑色，w 的右子红色
        {
          const wRightUpdated = w.right ?? NIL_ID;
          const wRightNode = this.isNilNode(wRightUpdated) ? null : this.getNode(wRightUpdated);
          const oldWColor = w.color;
          const oldParentColor = xParent.color;

          w.color = xParent.color;
          xParent.color = "black";
          if (wRightNode) {
            wRightNode.color = "black";
          }

          const recolors: { node: string; from: string; to: string }[] = [
            { node: wId, from: oldWColor, to: oldParentColor },
            { node: xParentId, from: oldParentColor, to: "black" },
          ];
          if (wRightNode) {
            recolors.push({ node: wRightUpdated, from: "red", to: "black" });
          }

          recorder.record({
            type: "RECOLOR",
            title: "Delete Case 4：兄弟的右子红色",
            description:
              `兄弟节点 ${w.key} 的右子节点为红色。` +
              `将兄弟 ${w.key} 染为父节点颜色（${oldParentColor}），` +
              `父节点 ${xParent.key} 染为黑色，兄弟的右子节点染为黑色，` +
              `然后对父节点 ${xParent.key} 左旋。修复完成。`,
            codeLine: line,
            targets: [wId, xParentId, wRightUpdated],
            payload: { recolors },
          });

          this.leftRotate(xParentId, recorder, line);
        }

        // Case 4 后直接退出
        break;
      } else {
        // 对称情况：x 是右子节点
        let wId = xParent.left ?? NIL_ID;
        let w = this.getNode(wId);

        // Case 1 对称: x 的兄弟 w 是红色
        if (!this.isNilNode(wId) && w.color === "red") {
          const oldWColor = w.color;
          const oldParentColor = xParent.color;
          w.color = "black";
          xParent.color = "red";

          recorder.record({
            type: "RECOLOR",
            title: "Delete Case 1（对称）：兄弟节点为红色",
            description:
              `节点 ${this.isNilNode(currentXId) ? "NIL" : this.getNode(currentXId).key} 的兄弟 ` +
              `${w.key} 为红色。` +
              `将兄弟 ${w.key} 染为黑色，父节点 ${xParent.key} 染为红色，` +
              `然后对父节点 ${xParent.key} 右旋。`,
            codeLine: line,
            targets: [wId, xParentId],
            payload: { recolors: [
              { node: wId, from: oldWColor, to: "black" },
              { node: xParentId, from: oldParentColor, to: "red" },
            ] },
          });

          this.rightRotate(xParentId, recorder, line);

          // 更新兄弟
          wId = xParent.left ?? NIL_ID;
          w = this.getNode(wId);
        }

        // Case 2 对称: w 是黑色，w 的两个子节点都是黑色
        const wLeft = w.left ?? NIL_ID;
        const wRight = w.right ?? NIL_ID;
        const wLeftBlack = this.isNilNode(wLeft) || this.getNode(wLeft).color === "black";
        const wRightBlack = this.isNilNode(wRight) || this.getNode(wRight).color === "black";

        if (wLeftBlack && wRightBlack) {
          const oldWColor = w.color;
          w.color = "red";

          recorder.record({
            type: "RECOLOR",
            title: "Delete Case 2（对称）：兄弟的两个子节点均为黑色",
            description:
              `兄弟节点 ${this.isNilNode(wId) ? "NIL" : w.key} 的两个子节点均为黑色（或 NIL）。` +
              `将兄弟 ${this.isNilNode(wId) ? "NIL" : w.key} 染为红色，` +
              `然后将 x 上移到父节点 ${xParent.key}。`,
            codeLine: line,
            targets: [wId, xParentId],
            payload: { recolors: [
              { node: wId, from: oldWColor, to: "red" },
            ] },
          });

          currentXId = xParentId;
          continue;
        }

        // Case 3 对称: w 是黑色，w 的右子红色，左子黑色
        if (wLeftBlack) {
          const wRightNode = this.isNilNode(wRight) ? null : this.getNode(wRight);
          const oldWColor = w.color;
          const oldWRightColor = wRightNode ? wRightNode.color : "black" as const;

          if (wRightNode) {
            wRightNode.color = "black";
          }
          w.color = "red";

          recorder.record({
            type: "RECOLOR",
            title: "Delete Case 3（对称）：兄弟的右子红色，左子黑色",
            description:
              `兄弟节点 ${w.key} 的右子节点 ${wRightNode ? wRightNode.key : "NIL"} 为红色，` +
              `左子节点为黑色。` +
              `将兄弟 ${w.key} 染为红色，兄弟的右子 ${wRightNode ? wRightNode.key : "NIL"} 染为黑色，` +
              `然后对兄弟 ${w.key} 左旋，转化为 Case 4。`,
            codeLine: line,
            targets: [wId, wRight],
            payload: { recolors: [
              { node: wId, from: oldWColor, to: "red" },
              ...(wRightNode ? [{ node: wRight, from: oldWRightColor, to: "black" as const }] : []),
            ] },
          });

          this.leftRotate(wId, recorder, line);

          // 更新兄弟
          wId = xParent.left ?? NIL_ID;
          w = this.getNode(wId);
        }

        // Case 4 对称: w 是黑色，w 的左子红色
        {
          const wLeftUpdated = w.left ?? NIL_ID;
          const wLeftNode = this.isNilNode(wLeftUpdated) ? null : this.getNode(wLeftUpdated);
          const oldWColor = w.color;
          const oldParentColor = xParent.color;

          w.color = xParent.color;
          xParent.color = "black";
          if (wLeftNode) {
            wLeftNode.color = "black";
          }

          const recolors: { node: string; from: string; to: string }[] = [
            { node: wId, from: oldWColor, to: oldParentColor },
            { node: xParentId, from: oldParentColor, to: "black" },
          ];
          if (wLeftNode) {
            recolors.push({ node: wLeftUpdated, from: "red", to: "black" });
          }

          recorder.record({
            type: "RECOLOR",
            title: "Delete Case 4（对称）：兄弟的左子红色",
            description:
              `兄弟节点 ${w.key} 的左子节点为红色。` +
              `将兄弟 ${w.key} 染为父节点颜色（${oldParentColor}），` +
              `父节点 ${xParent.key} 染为黑色，兄弟的左子节点染为黑色，` +
              `然后对父节点 ${xParent.key} 右旋。修复完成。`,
            codeLine: line,
            targets: [wId, xParentId, wLeftUpdated],
            payload: { recolors },
          });

          this.rightRotate(xParentId, recorder, line);
        }

        // Case 4 后直接退出
        break;
      }
    }

    // 确保 x（或根）为黑色
    this.ensureRootBlack(recorder, line);
  }
}
