import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── 内部节点结构 ──

interface TwoThreeNode {
  id: string;
  keys: number[]; // 1 个 key (2-节点) 或 2 个 key (3-节点)
  children: string[]; // 2 个或 3 个子节点
  parent: string | null;
  isLeaf: boolean;
}

// ── 2-3 树 Runtime ──

export class TwoThreeTreeRuntime implements StructureRuntime {
  private nodes = new Map<string, TwoThreeNode>();
  private rootId: string | null = null;
  private idCounter = 0;

  // ── 工具方法 ──

  private nextId(): string {
    this.idCounter += 1;
    return `ttn-${this.idCounter}`;
  }

  private getNode(id: string): TwoThreeNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`节点 ${id} 不存在`);
    return node;
  }

  private createNode(isLeaf: boolean): TwoThreeNode {
    const id = this.nextId();
    const node: TwoThreeNode = {
      id,
      keys: [],
      children: [],
      parent: null,
      isLeaf,
    };
    this.nodes.set(id, node);
    return node;
  }

  /** 将内部节点映射为可视化节点 */
  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      result[id] = {
        id,
        key: node.keys.join("|"),
        color: node.keys.length === 2 ? "red" : "default", // 3-节点用红色区分
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

  /** 计算树高 */
  private getHeight(): number {
    if (!this.rootId) return 0;
    let height = 0;
    let currentId: string | null = this.rootId;
    while (currentId) {
      height++;
      const node = this.getNode(currentId);
      currentId = node.children.length > 0 ? node.children[0] : null;
    }
    return height;
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
        for (const a of args) {
          this.doInsert(Number(a), recorder, line);
        }
        break;
      case "delete":
        for (const a of args) {
          this.doDelete(Number(a), recorder, line);
        }
        break;
      default:
        throw new Error(`2-3 树不支持方法 "${method}"`);
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
      height: {
        type: "number",
        value: this.getHeight(),
        display: `${this.getHeight()}`,
      },
      keyCount: {
        type: "number",
        value: this.getKeyCount(),
        display: `${this.getKeyCount()}`,
      },
      root: rootNode
        ? {
            type: "node",
            value: this.rootId,
            display: `Node([${rootNode.keys.join(", ")}])`,
          }
        : { type: "null", value: null, display: "null" },
    };
  }

  private getKeyCount(): number {
    let count = 0;
    for (const node of this.nodes.values()) {
      count += node.keys.length;
    }
    return count;
  }

  // ── 2-3 树插入 ──

  private doInsert(
    key: number,
    recorder: TraceRecorder,
    line: number,
  ): void {
    recorder.record({
      type: "VISIT_NODE",
      title: `开始插入 ${key}`,
      description: `准备将关键字 ${key} 插入 2-3 树`,
      codeLine: line,
      targets: [],
    });

    // 空树：创建根节点
    if (!this.rootId) {
      const root = this.createNode(true);
      root.keys.push(key);
      this.rootId = root.id;

      recorder.record({
        type: "CREATE_NODE",
        title: `创建根节点，插入 ${key}`,
        description: `2-3 树为空，创建根节点（2-节点）并插入 ${key}`,
        codeLine: line,
        targets: [root.id],
      });

      recorder.record({
        type: "MARK_FINAL",
        title: `插入 ${key} 完成`,
        description: `${key} 已作为根节点插入`,
        codeLine: line,
        targets: [root.id],
      });
      return;
    }

    // 第一步：从根开始查找叶子
    const leafId = this.findLeaf(key, recorder, line);
    const leaf = this.getNode(leafId);

    // 第二步：将 key 插入叶子（临时可能变成 4-节点）
    this.insertIntoLeaf(leaf, key, recorder, line);

    // 第三步：如果需要，从叶向上分裂
    this.fixOverflow(leafId, recorder, line);

    recorder.record({
      type: "MARK_FINAL",
      title: `插入 ${key} 完成`,
      description: `关键字 ${key} 已成功插入 2-3 树`,
      codeLine: line,
      targets: [this.rootId!],
    });
  }

  /** 从根节点沿路径查找 key 应该插入的叶子节点 */
  private findLeaf(
    key: number,
    recorder: TraceRecorder,
    line: number,
  ): string {
    let currentId = this.rootId!;

    while (true) {
      const current = this.getNode(currentId);

      recorder.record({
        type: "VISIT_NODE",
        title: `访问节点 [${current.keys.join(", ")}]`,
        description: `正在查找 ${key} 的插入位置，当前节点关键字: [${current.keys.join(", ")}]`,
        codeLine: line,
        targets: [currentId],
      });

      // 如果是叶子，就找到了
      if (current.isLeaf) {
        recorder.record({
          type: "VISIT_NODE",
          title: `找到叶子节点 [${current.keys.join(", ")}]`,
          description: `${key} 应插入此叶子节点`,
          codeLine: line,
          targets: [currentId],
        });
        return currentId;
      }

      // 根据关键字决定走哪个子节点
      const childIndex = this.findChildIndex(current, key, recorder, line);
      currentId = current.children[childIndex];
    }
  }

  /** 根据 key 值确定应走哪个子节点 */
  private findChildIndex(
    node: TwoThreeNode,
    key: number,
    recorder: TraceRecorder,
    line: number,
  ): number {
    if (node.keys.length === 1) {
      // 2-节点：1 个 key，2 个子节点
      const goLeft = key < node.keys[0];
      recorder.record({
        type: "COMPARE",
        title: `比较 ${key} 与 ${node.keys[0]}`,
        description: `${key} ${goLeft ? "<" : ">="} ${node.keys[0]}，${goLeft ? "进入左子树" : "进入右子树"}`,
        codeLine: line,
        targets: [node.id],
      });
      return goLeft ? 0 : 1;
    } else {
      // 3-节点：2 个 key，3 个子节点
      if (key < node.keys[0]) {
        recorder.record({
          type: "COMPARE",
          title: `比较 ${key} 与 [${node.keys[0]}, ${node.keys[1]}]`,
          description: `${key} < ${node.keys[0]}，进入左子树`,
          codeLine: line,
          targets: [node.id],
        });
        return 0;
      } else if (key < node.keys[1]) {
        recorder.record({
          type: "COMPARE",
          title: `比较 ${key} 与 [${node.keys[0]}, ${node.keys[1]}]`,
          description: `${node.keys[0]} <= ${key} < ${node.keys[1]}，进入中间子树`,
          codeLine: line,
          targets: [node.id],
        });
        return 1;
      } else {
        recorder.record({
          type: "COMPARE",
          title: `比较 ${key} 与 [${node.keys[0]}, ${node.keys[1]}]`,
          description: `${key} >= ${node.keys[1]}，进入右子树`,
          codeLine: line,
          targets: [node.id],
        });
        return 2;
      }
    }
  }

  /** 将 key 插入叶子节点（保持有序） */
  private insertIntoLeaf(
    leaf: TwoThreeNode,
    key: number,
    recorder: TraceRecorder,
    line: number,
  ): void {
    // 有序插入
    let pos = 0;
    while (pos < leaf.keys.length && leaf.keys[pos] < key) pos++;
    leaf.keys.splice(pos, 0, key);

    if (leaf.keys.length === 3) {
      recorder.record({
        type: "SPLIT_NODE",
        title: `叶子节点溢出 [${leaf.keys.join(", ")}]`,
        description: `插入 ${key} 后叶子节点变成临时 4-节点 [${leaf.keys.join(", ")}]，需要分裂`,
        codeLine: line,
        targets: [leaf.id],
      });
    } else {
      recorder.record({
        type: "CREATE_NODE",
        title: `在叶子节点插入 ${key}`,
        description: `插入后节点关键字: [${leaf.keys.join(", ")}]，${leaf.keys.length === 1 ? "2-节点" : "3-节点"}`,
        codeLine: line,
        targets: [leaf.id],
      });
    }
  }

  /** 从指定节点开始向上修复溢出（4-节点分裂） */
  private fixOverflow(
    nodeId: string,
    recorder: TraceRecorder,
    line: number,
  ): void {
    let currentId: string | null = nodeId;

    while (currentId !== null) {
      const current = this.getNode(currentId);

      // 如果当前节点没有溢出（keys <= 2），结束
      if (current.keys.length <= 2) {
        break;
      }

      // 4-节点分裂：3 个 key，4 个子节点
      // 左 key -> 新左节点，中间 key 提升到父节点，右 key -> 新右节点
      const leftKey = current.keys[0];
      const midKey = current.keys[1];
      const rightKey = current.keys[2];

      // 创建新的左节点和右节点
      const leftNode = this.createNode(current.isLeaf);
      const rightNode = this.createNode(current.isLeaf);

      leftNode.keys = [leftKey];
      rightNode.keys = [rightKey];

      recorder.record({
        type: "SPLIT_NODE",
        title: `分裂节点 [${current.keys.join(", ")}]`,
        description: `4-节点 [${leftKey}, ${midKey}, ${rightKey}] 分裂：左节点 [${leftKey}]，提升 ${midKey}，右节点 [${rightKey}]`,
        codeLine: line,
        targets: [currentId, leftNode.id, rightNode.id],
      });

      // 分配子节点
      if (!current.isLeaf && current.children.length === 4) {
        // 4 个子节点分配给左右新节点
        leftNode.children = [current.children[0], current.children[1]];
        rightNode.children = [current.children[2], current.children[3]];

        // 更新子节点的 parent 指针
        for (const cid of leftNode.children) {
          const child = this.nodes.get(cid);
          if (child) child.parent = leftNode.id;
        }
        for (const cid of rightNode.children) {
          const child = this.nodes.get(cid);
          if (child) child.parent = rightNode.id;
        }

        leftNode.isLeaf = false;
        rightNode.isLeaf = false;
      }

      // 提升中间 key 到父节点
      if (current.parent === null) {
        // 当前是根节点且溢出：创建新根
        const newRoot = this.createNode(false);
        newRoot.keys = [midKey];
        newRoot.children = [leftNode.id, rightNode.id];
        leftNode.parent = newRoot.id;
        rightNode.parent = newRoot.id;

        // 删除旧根，设新根
        this.nodes.delete(currentId);
        this.rootId = newRoot.id;

        recorder.record({
          type: "PROMOTE_KEY",
          title: `根节点分裂，${midKey} 成为新根`,
          description: `根节点溢出，将 ${midKey} 提升为新的根节点`,
          codeLine: line,
          targets: [newRoot.id],
        });

        recorder.record({
          type: "LINK_NODE",
          title: `连接新根与子节点`,
          description: `新根 [${midKey}] 的左子节点 [${leftKey}]，右子节点 [${rightKey}]`,
          codeLine: line,
          targets: [newRoot.id, leftNode.id, rightNode.id],
        });
        return; // 新根只有 1 个 key，不会溢出
      } else {
        // 有父节点：提升中间 key
        const parent = this.getNode(current.parent);

        // 在父节点中找到 current 的位置
        const childIndex = parent.children.indexOf(currentId);

        // 将 midKey 插入父节点的 keys（保持有序）
        let insertPos = 0;
        while (
          insertPos < parent.keys.length &&
          parent.keys[insertPos] < midKey
        )
          insertPos++;
        parent.keys.splice(insertPos, 0, midKey);

        // 替换 current 为 leftNode 和 rightNode
        parent.children.splice(childIndex, 1, leftNode.id, rightNode.id);
        leftNode.parent = parent.id;
        rightNode.parent = parent.id;

        // 删除旧节点
        this.nodes.delete(currentId);

        recorder.record({
          type: "PROMOTE_KEY",
          title: `提升 ${midKey} 到父节点 [${parent.keys.join(", ")}]`,
          description: `将 ${midKey} 提升到父节点，父节点关键字变为 [${parent.keys.join(", ")}]`,
          codeLine: line,
          targets: [parent.id],
        });

        recorder.record({
          type: "LINK_NODE",
          title: `连接 [${leftKey}] 和 [${rightKey}] 到父节点`,
          description: `分裂产生的 [${leftKey}] 和 [${rightKey}] 连接到父节点`,
          codeLine: line,
          targets: [parent.id, leftNode.id, rightNode.id],
        });

        // 继续向上检查父节点是否溢出
        currentId = parent.id;
      }
    }
  }

  // ── 2-3 树删除 ──

  private doDelete(
    key: number,
    recorder: TraceRecorder,
    line: number,
  ): void {
    recorder.record({
      type: "VISIT_NODE",
      title: `开始删除 ${key}`,
      description: `准备从 2-3 树中删除关键字 ${key}`,
      codeLine: line,
      targets: [],
    });

    if (!this.rootId) {
      recorder.record({
        type: "VISIT_NODE",
        title: `树为空`,
        description: `2-3 树为空，无法删除 ${key}`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    // 第一步：搜索 key 所在节点
    const found = this.searchKey(key, recorder, line);
    if (!found) {
      recorder.record({
        type: "VISIT_NODE",
        title: `未找到 ${key}`,
        description: `关键字 ${key} 不在 2-3 树中，无法删除`,
        codeLine: line,
        targets: [],
      });
      return;
    }

    const { nodeId, keyIndex } = found;
    let targetNodeId = nodeId;
    let targetKeyIndex = keyIndex;

    // 第二步：如果 key 在内部节点，用前驱替换，转化为删除叶子中的 key
    const targetNode = this.getNode(targetNodeId);
    if (!targetNode.isLeaf) {
      const pred = this.getPredecessor(targetNodeId, targetKeyIndex, recorder, line);
      recorder.record({
        type: "COMPARE",
        title: `用前驱 ${pred.key} 替换 ${key}`,
        description: `${key} 在内部节点中，用前驱 ${pred.key}（叶子节点中的最大值）替换，然后删除叶子中的 ${pred.key}`,
        codeLine: line,
        targets: [targetNodeId, pred.nodeId],
      });

      // 替换
      targetNode.keys[targetKeyIndex] = pred.key;
      // 转化为删除叶子中的前驱 key
      targetNodeId = pred.nodeId;
      targetKeyIndex = pred.keyIndex;
    }

    // 第三步：从叶子中删除 key
    const leaf = this.getNode(targetNodeId);
    const removedKey = leaf.keys[targetKeyIndex];
    leaf.keys.splice(targetKeyIndex, 1);

    recorder.record({
      type: "DELETE_NODE",
      title: `从叶子节点删除 ${removedKey}`,
      description: `从叶子节点中删除 ${removedKey}，剩余关键字: [${leaf.keys.join(", ") || "空"}]`,
      codeLine: line,
      targets: [targetNodeId],
    });

    // 第四步：如果叶子变空（下溢），修复
    if (leaf.keys.length === 0 && leaf.id !== this.rootId) {
      this.fixUnderflow(targetNodeId, recorder, line);
    }

    // 第五步：如果根节点变空，降低树高
    if (this.rootId) {
      const root = this.getNode(this.rootId);
      if (root.keys.length === 0 && root.children.length > 0) {
        const newRootId = root.children[0];
        const newRoot = this.getNode(newRootId);
        newRoot.parent = null;
        this.nodes.delete(this.rootId);
        this.rootId = newRootId;

        recorder.record({
          type: "PROMOTE_KEY",
          title: `根节点变空，降低树高`,
          description: `根节点没有关键字，将其唯一子节点 [${newRoot.keys.join(", ")}] 提升为新根`,
          codeLine: line,
          targets: [newRootId],
        });
      } else if (root.keys.length === 0 && root.children.length === 0) {
        // 树变为空
        this.nodes.delete(this.rootId);
        this.rootId = null;

        recorder.record({
          type: "DELETE_NODE",
          title: `树已清空`,
          description: `删除最后一个关键字后 2-3 树为空`,
          codeLine: line,
          targets: [],
        });
      }
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `删除 ${key} 完成`,
      description: `关键字 ${key} 已成功从 2-3 树中删除`,
      codeLine: line,
      targets: this.rootId ? [this.rootId] : [],
    });
  }

  /** 搜索 key 所在节点，返回节点 ID 和 key 在 keys 数组中的索引 */
  private searchKey(
    key: number,
    recorder: TraceRecorder,
    line: number,
  ): { nodeId: string; keyIndex: number } | null {
    let currentId: string | null = this.rootId!;

    while (currentId !== null) {
      const current = this.getNode(currentId);

      recorder.record({
        type: "VISIT_NODE",
        title: `搜索节点 [${current.keys.join(", ")}]`,
        description: `正在查找 ${key}，当前节点关键字: [${current.keys.join(", ")}]`,
        codeLine: line,
        targets: [currentId],
      });

      // 检查 key 是否在当前节点
      const keyIndex = current.keys.indexOf(key);
      if (keyIndex !== -1) {
        recorder.record({
          type: "VISIT_NODE",
          title: `找到 ${key}`,
          description: `在节点 [${current.keys.join(", ")}] 中找到关键字 ${key}`,
          codeLine: line,
          targets: [currentId],
        });
        return { nodeId: currentId, keyIndex };
      }

      // 如果是叶子且没找到，key 不存在
      if (current.isLeaf) {
        return null;
      }

      // 向下搜索
      const childIndex = this.findChildIndex(current, key, recorder, line);
      currentId = current.children[childIndex];
    }

    return null;
  }

  /** 获取内部节点指定 key 的前驱（左子树中的最大值） */
  private getPredecessor(
    nodeId: string,
    keyIndex: number,
    recorder: TraceRecorder,
    line: number,
  ): { nodeId: string; key: number; keyIndex: number } {
    const node = this.getNode(nodeId);
    // 前驱在 keyIndex 对应的左子树中（即 children[keyIndex]）
    let currentId: string = node.children[keyIndex];
    let current = this.getNode(currentId);

    recorder.record({
      type: "VISIT_NODE",
      title: `查找 ${node.keys[keyIndex]} 的前驱`,
      description: `进入 ${node.keys[keyIndex]} 的左子树查找最大值`,
      codeLine: line,
      targets: [currentId],
    });

    // 沿右子树向下走到最右叶子
    while (!current.isLeaf) {
      currentId = current.children[current.children.length - 1];
      current = this.getNode(currentId);

      recorder.record({
        type: "VISIT_NODE",
        title: `沿右子树向下 [${current.keys.join(", ")}]`,
        description: `查找前驱，访问节点 [${current.keys.join(", ")}]`,
        codeLine: line,
        targets: [currentId],
      });
    }

    // 叶子中最右边的 key 就是前驱
    const predKeyIndex = current.keys.length - 1;
    const predKey = current.keys[predKeyIndex];

    recorder.record({
      type: "VISIT_NODE",
      title: `找到前驱 ${predKey}`,
      description: `前驱为叶子节点 [${current.keys.join(", ")}] 中的 ${predKey}`,
      codeLine: line,
      targets: [currentId],
    });

    return { nodeId: currentId, key: predKey, keyIndex: predKeyIndex };
  }

  /** 从指定节点向上修复下溢（空节点） */
  private fixUnderflow(
    nodeId: string,
    recorder: TraceRecorder,
    line: number,
  ): void {
    let currentId: string | null = nodeId;

    while (currentId !== null && currentId !== this.rootId) {
      const current = this.getNode(currentId);
      // 如果当前节点有 key，不需要修复
      if (current.keys.length > 0) break;

      const parentId = current.parent!;
      const parent = this.getNode(parentId);
      const childIndex = parent.children.indexOf(currentId);

      recorder.record({
        type: "SPLIT_NODE",
        title: `节点下溢`,
        description: `节点变空（下溢），父节点 [${parent.keys.join(", ")}] 需要修复`,
        codeLine: line,
        targets: [currentId, parentId],
      });

      // 尝试从左兄弟借位
      const leftSiblingId = childIndex > 0 ? parent.children[childIndex - 1] : null;
      if (leftSiblingId) {
        const leftSibling = this.getNode(leftSiblingId);
        if (leftSibling.keys.length >= 2) {
          this.borrowFromLeft(currentId, childIndex, recorder, line);
          break;
        }
      }

      // 尝试从右兄弟借位
      const rightSiblingId = childIndex < parent.children.length - 1 ? parent.children[childIndex + 1] : null;
      if (rightSiblingId) {
        const rightSibling = this.getNode(rightSiblingId);
        if (rightSibling.keys.length >= 2) {
          this.borrowFromRight(currentId, childIndex, recorder, line);
          break;
        }
      }

      // 无法借位，合并
      // 优先与左兄弟合并，如果没有左兄弟则与右兄弟合并
      if (leftSiblingId) {
        this.mergeWithLeft(currentId, childIndex, recorder, line);
      } else {
        this.mergeWithRight(currentId, childIndex, recorder, line);
      }

      // 继续向上检查父节点是否下溢
      currentId = parentId;
    }
  }

  /** 从左兄弟借位：左兄弟的最后一个 key 上移到父节点，父节点的 key 下移到当前节点 */
  private borrowFromLeft(
    nodeId: string,
    childIndex: number,
    recorder: TraceRecorder,
    line: number,
  ): void {
    const node = this.getNode(nodeId);
    const parentId = node.parent!;
    const parent = this.getNode(parentId);
    const leftSiblingId = parent.children[childIndex - 1];
    const leftSibling = this.getNode(leftSiblingId!);

    // 左兄弟的最后一个 key 上移到父节点，父节点对应位置的 key 下移
    const borrowedKey = leftSibling.keys.pop()!;
    const parentKeyIndex = childIndex - 1;
    const parentKey = parent.keys[parentKeyIndex];
    parent.keys[parentKeyIndex] = borrowedKey;

    // 父节点的 key 下移到当前节点
    node.keys.unshift(parentKey);

    // 如果不是叶子，还需要转移子节点
    if (!node.isLeaf && leftSibling.children.length > 0) {
      const transferredChild = leftSibling.children.pop()!;
      node.children.unshift(transferredChild);
      const child = this.getNode(transferredChild);
      child.parent = nodeId;
    }

    recorder.record({
      type: "PROMOTE_KEY",
      title: `从左兄弟借位`,
      description: `左兄弟 [${borrowedKey}] 上移到父节点，父节点 ${parentKey} 下移到空节点。父节点: [${parent.keys.join(", ")}]，当前节点: [${node.keys.join(", ")}]，左兄弟: [${leftSibling.keys.join(", ")}]`,
      codeLine: line,
      targets: [nodeId, parentId, leftSiblingId!],
    });
  }

  /** 从右兄弟借位：右兄弟的第一个 key 上移到父节点，父节点的 key 下移到当前节点 */
  private borrowFromRight(
    nodeId: string,
    childIndex: number,
    recorder: TraceRecorder,
    line: number,
  ): void {
    const node = this.getNode(nodeId);
    const parentId = node.parent!;
    const parent = this.getNode(parentId);
    const rightSiblingId = parent.children[childIndex + 1];
    const rightSibling = this.getNode(rightSiblingId!);

    // 右兄弟的第一个 key 上移到父节点，父节点对应位置的 key 下移
    const borrowedKey = rightSibling.keys.shift()!;
    const parentKeyIndex = childIndex;
    const parentKey = parent.keys[parentKeyIndex];
    parent.keys[parentKeyIndex] = borrowedKey;

    // 父节点的 key 下移到当前节点
    node.keys.push(parentKey);

    // 如果不是叶子，还需要转移子节点
    if (!node.isLeaf && rightSibling.children.length > 0) {
      const transferredChild = rightSibling.children.shift()!;
      node.children.push(transferredChild);
      const child = this.getNode(transferredChild);
      child.parent = nodeId;
    }

    recorder.record({
      type: "PROMOTE_KEY",
      title: `从右兄弟借位`,
      description: `右兄弟 [${borrowedKey}] 上移到父节点，父节点 ${parentKey} 下移到空节点。父节点: [${parent.keys.join(", ")}]，当前节点: [${node.keys.join(", ")}]，右兄弟: [${rightSibling.keys.join(", ")}]`,
      codeLine: line,
      targets: [nodeId, parentId, rightSiblingId!],
    });
  }

  /** 与左兄弟合并：将当前节点、父节点的一个 key、左兄弟合并为一个节点 */
  private mergeWithLeft(
    nodeId: string,
    childIndex: number,
    recorder: TraceRecorder,
    line: number,
  ): void {
    const node = this.getNode(nodeId);
    const parentId = node.parent!;
    const parent = this.getNode(parentId);
    const leftSiblingId = parent.children[childIndex - 1];
    const leftSibling = this.getNode(leftSiblingId!);

    // 从父节点取出 key（childIndex - 1 位置）
    const parentKey = parent.keys[childIndex - 1];
    parent.keys.splice(childIndex - 1, 1);

    // 合并：左兄弟 keys + 父节点 key + 当前节点 keys（当前节点为空，所以只有父节点 key）
    leftSibling.keys.push(parentKey);

    // 转移子节点
    if (!node.isLeaf) {
      for (const cid of node.children) {
        leftSibling.children.push(cid);
        const child = this.getNode(cid);
        child.parent = leftSiblingId;
      }
    }

    // 从父节点移除当前节点
    parent.children.splice(childIndex, 1);

    // 删除空节点
    this.nodes.delete(nodeId);

    recorder.record({
      type: "LINK_NODE",
      title: `与左兄弟合并`,
      description: `将父节点的 ${parentKey} 下移，与左兄弟合并为 [${leftSibling.keys.join(", ")}]。父节点剩余: [${parent.keys.join(", ") || "空"}]`,
      codeLine: line,
      targets: [leftSiblingId!, parentId],
    });
  }

  /** 与右兄弟合并：将当前节点、父节点的一个 key、右兄弟合并为一个节点 */
  private mergeWithRight(
    nodeId: string,
    childIndex: number,
    recorder: TraceRecorder,
    line: number,
  ): void {
    const node = this.getNode(nodeId);
    const parentId = node.parent!;
    const parent = this.getNode(parentId);
    const rightSiblingId = parent.children[childIndex + 1];
    const rightSibling = this.getNode(rightSiblingId!);

    // 从父节点取出 key（childIndex 位置）
    const parentKey = parent.keys[childIndex];
    parent.keys.splice(childIndex, 1);

    // 合并：当前节点 keys（为空）+ 父节点 key + 右兄弟 keys
    node.keys.push(parentKey);
    node.keys.push(...rightSibling.keys);

    // 转移子节点
    if (!rightSibling.isLeaf) {
      for (const cid of rightSibling.children) {
        node.children.push(cid);
        const child = this.getNode(cid);
        child.parent = nodeId;
      }
    }

    // 从父节点移除右兄弟
    parent.children.splice(childIndex + 1, 1);

    // 删除右兄弟节点
    this.nodes.delete(rightSiblingId!);

    recorder.record({
      type: "LINK_NODE",
      title: `与右兄弟合并`,
      description: `将父节点的 ${parentKey} 下移，与右兄弟合并为 [${node.keys.join(", ")}]。父节点剩余: [${parent.keys.join(", ") || "空"}]`,
      codeLine: line,
      targets: [nodeId, parentId],
    });
  }
}
