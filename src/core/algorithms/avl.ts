import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface AVLNode {
  id: string;
  key: number;
  height: number;
  left: string | null;
  right: string | null;
  parent: string | null;
  pending?: boolean;
}

export class AVLTreeRuntime implements StructureRuntime {
  private nodes = new Map<string, AVLNode>();
  private rootId: string | null = null;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `avl-node-${this.idCounter}`;
  }

  private getNode(id: string): AVLNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`节点 ${id} 不存在`);
    return node;
  }

  private getHeight(id: string | null): number {
    if (id === null) return 0;
    return this.getNode(id).height;
  }

  private updateHeight(id: string): void {
    const node = this.getNode(id);
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
  }

  private getBalance(id: string): number {
    const node = this.getNode(id);
    return this.getHeight(node.left) - this.getHeight(node.right);
  }

  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      const bf = this.getBalance(id);
      result[id] = {
        id,
        key: node.key,
        left: node.left,
        right: node.right,
        parent: node.parent,
        metadata: { height: node.height, balanceFactor: bf, ...(node.pending ? { pending: true } : {}) },
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
        throw new Error(`AVLTree 不支持方法 "${method}"`);
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
      height: {
        type: "number",
        value: this.getHeight(this.rootId),
        display: `${this.getHeight(this.rootId)}`,
      },
    };
  }

  // ── 旋转操作 ──

  private leftRotate(xId: string, recorder: TraceRecorder, line: number): void {
    const x = this.getNode(xId);
    const yId = x.right!;
    const y = this.getNode(yId);

    x.right = y.left;
    if (y.left !== null) {
      this.getNode(y.left).parent = xId;
    }

    y.parent = x.parent;
    if (x.parent === null) {
      this.rootId = yId;
    } else {
      const xParent = this.getNode(x.parent);
      if (xParent.left === xId) xParent.left = yId;
      else xParent.right = yId;
    }

    y.left = xId;
    x.parent = yId;

    this.updateHeight(xId);
    this.updateHeight(yId);

    recorder.record({
      type: "ROTATE_LEFT",
      title: `对节点 ${x.key} 执行左旋`,
      description: `左旋：将 ${x.key} 的右子节点 ${y.key} 提升为父节点，${x.key} 降为 ${y.key} 的左子节点`,
      codeLine: line,
      targets: [xId, yId],
      payload: { pivot: xId, direction: "left" },
    });
  }

  private rightRotate(yId: string, recorder: TraceRecorder, line: number): void {
    const y = this.getNode(yId);
    const xId = y.left!;
    const x = this.getNode(xId);

    y.left = x.right;
    if (x.right !== null) {
      this.getNode(x.right).parent = yId;
    }

    x.parent = y.parent;
    if (y.parent === null) {
      this.rootId = xId;
    } else {
      const yParent = this.getNode(y.parent);
      if (yParent.left === yId) yParent.left = xId;
      else yParent.right = xId;
    }

    x.right = yId;
    y.parent = xId;

    this.updateHeight(yId);
    this.updateHeight(xId);

    recorder.record({
      type: "ROTATE_RIGHT",
      title: `对节点 ${y.key} 执行右旋`,
      description: `右旋：将 ${y.key} 的左子节点 ${x.key} 提升为父节点，${y.key} 降为 ${x.key} 的右子节点`,
      codeLine: line,
      targets: [yId, xId],
      payload: { pivot: yId, direction: "right" },
    });
  }

  // ── 平衡修复 ──

  private rebalance(nodeId: string, recorder: TraceRecorder, line: number): void {
    let currentId: string | null = nodeId;

    while (currentId !== null) {
      this.updateHeight(currentId);
      const bf = this.getBalance(currentId);
      const current = this.getNode(currentId);

      if (Math.abs(bf) > 1) {
        recorder.record({
          type: "CHECK_INVARIANT",
          title: `节点 ${current.key} 不平衡（BF = ${bf}）`,
          description: `节点 ${current.key} 的平衡因子为 ${bf}（左子树高 ${this.getHeight(current.left)}，右子树高 ${this.getHeight(current.right)}），需要旋转修复`,
          codeLine: line,
          targets: [currentId],
        });

        if (bf > 1) {
          // 左子树高
          const leftId = current.left!;
          if (this.getBalance(leftId) < 0) {
            // LR 型：先对左子左旋
            recorder.record({
              type: "ROTATE_LEFT",
              title: `LR 型：先对 ${this.getNode(leftId).key} 左旋`,
              description: `LR 型失衡：先对左子节点 ${this.getNode(leftId).key} 左旋，转化为 LL 型`,
              codeLine: line,
              targets: [leftId],
            });
            this.leftRotate(leftId, recorder, line);
          }
          // LL 型：右旋
          this.rightRotate(currentId, recorder, line);
        } else {
          // 右子树高
          const rightId = current.right!;
          if (this.getBalance(rightId) > 0) {
            // RL 型：先对右子右旋
            recorder.record({
              type: "ROTATE_RIGHT",
              title: `RL 型：先对 ${this.getNode(rightId).key} 右旋`,
              description: `RL 型失衡：先对右子节点 ${this.getNode(rightId).key} 右旋，转化为 RR 型`,
              codeLine: line,
              targets: [rightId],
            });
            this.rightRotate(rightId, recorder, line);
          }
          // RR 型：左旋
          this.leftRotate(currentId, recorder, line);
        }
      }

      currentId = this.getNode(currentId).parent;
    }
  }

  // ── 删除 ──

  private doDelete(key: number, recorder: TraceRecorder, line: number): void {
    if (this.rootId === null) {
      recorder.record({
        type: "COMPARE",
        title: `树为空，无法删除 ${key}`,
        description: `当前树为空，不存在节点 ${key}`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    // 1. BST 搜索目标节点
    let targetId: string | null = null;
    let currentId: string | null = this.rootId;

    while (currentId !== null) {
      const current = this.getNode(currentId);
      const goLeft = key < current.key;

      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${current.key}`,
        description: `${key} ${key === current.key ? "=" : goLeft ? "<" : ">"} ${current.key}，${key === current.key ? "找到目标节点" : goLeft ? "向左子树移动" : "向右子树移动"}`,
        codeLine: line,
        targets: [currentId],
        payload: { direction: key === current.key ? "found" : goLeft ? "left" : "right" },
      });

      if (key === current.key) {
        targetId = currentId;
        break;
      }
      currentId = goLeft ? current.left : current.right;
    }

    if (targetId === null) {
      recorder.record({
        type: "COMPARE",
        title: `未找到节点 ${key}`,
        description: `树中不存在键值为 ${key} 的节点，无需删除`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    const target = this.getNode(targetId);
    const parentId = target.parent;

    // 2. 按三种情况执行 BST 删除
    if (target.left === null && target.right === null) {
      // 情况一：叶子节点，直接删除
      this.unlinkNode(targetId, recorder, line);
      const rebalanceStart = parentId;
      this.nodes.delete(targetId);

      recorder.record({
        type: "DELETE_NODE",
        title: `删除叶子节点 ${key}`,
        description: `节点 ${key} 为叶子节点，直接移除`,
        codeLine: line,
        targets: [targetId],
      });

      // 从被删节点的父节点开始向上 rebalance
      if (rebalanceStart !== null) {
        this.rebalance(rebalanceStart, recorder, line);
      }

      recorder.record({
        type: "MARK_FINAL",
        title: `删除 ${key} 完成`,
        description: `节点 ${key} 已成功删除，AVL 树已恢复平衡`,
        codeLine: line,
        targets: [],
      });
    } else if (target.left === null || target.right === null) {
      // 情况二：只有一个子节点，用子节点替换
      const childId = target.left ?? target.right!;
      const child = this.getNode(childId);

      recorder.record({
        type: "UNLINK_NODE",
        title: `断开节点 ${target.key} 与其子节点 ${child.key}`,
        description: `节点 ${target.key} 只有一个子节点 ${child.key}，准备用子节点替换被删节点`,
        codeLine: line,
        targets: [targetId, childId],
      });

      // 先断开 target 与其父节点的关系
      this.unlinkNode(targetId, recorder, line);
      const rebalanceStart = target.parent;

      // 将子节点连接到 target 原来的父节点位置
      child.parent = target.parent;
      if (target.parent === null) {
        this.rootId = childId;
      } else {
        const parent = this.getNode(target.parent);
        if (parent.left === targetId) parent.left = childId;
        else parent.right = childId;
      }

      recorder.record({
        type: "LINK_NODE",
        title: `${child.key} 替换 ${target.key} 的位置`,
        description: `将子节点 ${child.key} 提升到被删节点 ${target.key} 的位置`,
        codeLine: line,
        targets: [childId],
        payload: { role: target.parent === null ? "root" : "replace" },
      });

      // 删除 target
      this.nodes.delete(targetId);
      recorder.record({
        type: "DELETE_NODE",
        title: `删除节点 ${key}`,
        description: `节点 ${key} 已被其唯一子节点 ${child.key} 替换并删除`,
        codeLine: line,
        targets: [targetId],
      });

      // 从被删节点的原父节点开始向上 rebalance
      if (rebalanceStart !== null) {
        this.rebalance(rebalanceStart, recorder, line);
      }

      recorder.record({
        type: "MARK_FINAL",
        title: `删除 ${key} 完成`,
        description: `节点 ${key} 已成功删除，AVL 树已恢复平衡`,
        codeLine: line,
        targets: [],
      });
    } else {
      // 情况三：有两个子节点，找右子树最小值（中序后继）替换
      let successorId = target.right;
      while (this.getNode(successorId).left !== null) {
        recorder.record({
          type: "COMPARE",
          title: `寻找后继：访问 ${this.getNode(successorId).key}`,
          description: `在右子树中寻找最小值（中序后继），向左子树移动`,
          codeLine: line,
          targets: [successorId],
          payload: { direction: "left" },
        });
        successorId = this.getNode(successorId).left!;
      }

      const successor = this.getNode(successorId);
      recorder.record({
        type: "COMPARE",
        title: `找到后继节点 ${successor.key}`,
        description: `节点 ${key} 的中序后继为 ${successor.key}（右子树最小值）`,
        codeLine: line,
        targets: [successorId],
        payload: { direction: "found" },
      });

      const rebalanceStart = successor.parent === targetId
        ? successorId
        : successor.parent;

      // 先将后继从原位置摘除（后继最多有一个右子节点，不可能有左子节点）
      if (successor.right !== null) {
        const succChild = this.getNode(successor.right);
        this.unlinkNode(successorId, recorder, line);
        const succParent = this.getNode(successor.parent!);
        succChild.parent = successor.parent;
        if (succParent.left === successorId) succParent.left = successor.right;
        else succParent.right = successor.right;

        recorder.record({
          type: "LINK_NODE",
          title: `${succChild.key} 替换后继 ${successor.key} 的位置`,
          description: `后继节点 ${successor.key} 有右子节点 ${succChild.key}，将其提升`,
          codeLine: line,
          targets: [successor.right],
          payload: { role: "replace" },
        });
      } else {
        this.unlinkNode(successorId, recorder, line);
      }

      // 用后继替换 target：复用 target 的连接关系
      recorder.record({
        type: "RECOLOR",
        title: `用后继 ${successor.key} 替换 ${target.key}`,
        description: `将后继节点 ${successor.key} 放入被删节点 ${target.key} 的位置`,
        codeLine: line,
        targets: [targetId, successorId],
      });

      // 保存 target 的原有连接
      const tParent = target.parent;
      const tLeft = target.left;
      const tRight = target.right;

      // 断开 target
      this.unlinkNode(targetId, recorder, line);

      // 将 successor 放入 target 的位置
      successor.parent = tParent;
      successor.left = tLeft;
      successor.right = tRight === successorId ? successor.right : tRight;

      if (tParent === null) {
        this.rootId = successorId;
      } else {
        const parent = this.getNode(tParent);
        if (parent.left === targetId) parent.left = successorId;
        else parent.right = successorId;
      }

      if (tLeft !== null) this.getNode(tLeft).parent = successorId;
      if (tRight !== null && tRight !== successorId) {
        this.getNode(tRight).parent = successorId;
      }

      recorder.record({
        type: "LINK_NODE",
        title: `后继 ${successor.key} 已替换 ${target.key}`,
        description: `${successor.key} 继承了 ${target.key} 的所有连接关系`,
        codeLine: line,
        targets: [successorId],
        payload: { role: tParent === null ? "root" : "replace" },
      });

      // 删除 target
      this.nodes.delete(targetId);
      recorder.record({
        type: "DELETE_NODE",
        title: `删除节点 ${key}`,
        description: `节点 ${key} 已被后继 ${successor.key} 替换并删除`,
        codeLine: line,
        targets: [targetId],
      });

      // 更新后继节点高度
      this.updateHeight(successorId);

      // 从 rebalanceStart 开始向上 rebalance
      if (rebalanceStart !== null && this.nodes.has(rebalanceStart)) {
        this.rebalance(rebalanceStart, recorder, line);
      }

      recorder.record({
        type: "MARK_FINAL",
        title: `删除 ${key} 完成`,
        description: `节点 ${key} 已被后继 ${successor.key} 替换删除，AVL 树已恢复平衡`,
        codeLine: line,
        targets: [],
      });
    }
  }

  // ── 查找 ──

  private doSearch(key: number, recorder: TraceRecorder, line: number): void {
    if (this.rootId === null) {
      recorder.record({
        type: "VISIT_NODE",
        title: `查找 ${key}：树为空`,
        description: "AVL 树为空，查找失败",
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
      description: `${key} 不在 AVL 树中，查找失败`,
      codeLine: line,
      targets: [],
      payload: { found: false },
    });
  }

  /** 将节点与其父节点断开连接（不删除节点本身） */
  private unlinkNode(nodeId: string, recorder: TraceRecorder, line: number): void {
    const node = this.getNode(nodeId);
    if (node.parent === null) {
      this.rootId = null;
      return;
    }
    const parent = this.getNode(node.parent);
    if (parent.left === nodeId) parent.left = null;
    else parent.right = null;

    recorder.record({
      type: "UNLINK_NODE",
      title: `断开 ${node.key} 与父节点 ${parent.key} 的连接`,
      description: `移除 ${parent.key} 到 ${node.key} 的边`,
      codeLine: line,
      targets: [node.parent!, nodeId],
    });
  }

  // ── 插入 ──

  private doInsert(key: number, recorder: TraceRecorder, line: number): void {
    const id = this.nextId();
    const newNode: AVLNode = {
      id,
      key,
      height: 1,
      left: null,
      right: null,
      parent: null,
    };

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

    // BST 插入
    let currentId: string | null = this.rootId;

    while (currentId !== null) {
      const current = this.getNode(currentId);
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
          break;
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
          break;
        }
        currentId = current.right;
      }
    }

    // 从新节点向上更新高度并重平衡
    this.rebalance(newNode.parent!, recorder, line);
  }
}
