import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface BPlusNode {
  id: string;
  keys: number[];
  children: string[];
  parent: string | null;
  isLeaf: boolean;
  next: string | null; // 叶子节点链表
}

export class BPlusTreeRuntime implements StructureRuntime {
  private nodes = new Map<string, BPlusNode>();
  private rootId: string | null = null;
  private nextId = 0;
  private t: number;

  constructor(t = 3) {
    this.t = t;
  }

  private newId(): string {
    return `bp-${this.nextId++}`;
  }

  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};
    for (const [id, node] of this.nodes) {
      result[id] = {
        id,
        key: node.isLeaf ? node.keys.join("|") : node.keys.join("|"),
        left: null,
        right: null,
        parent: node.parent,
        children: node.children.length > 0 ? [...node.children] : undefined,
        metadata: {
          keys: [...node.keys],
          isLeaf: node.isLeaf,
          nextLeaf: node.next,
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
        throw new Error(`BPlusTree 不支持方法 "${method}"`);
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
      description: `开始向 B+ 树插入关键字 ${key}`,
      codeLine: line,
      pseudoLine: 1,
      targets: [],
    });

    if (!this.rootId) {
      const leaf = this.createLeaf();
      leaf.keys.push(key);
      this.rootId = leaf.id;

      recorder.record({
        type: "CREATE_NODE",
        title: `创建根叶子节点，插入 ${key}`,
        description: `B+ 树为空，创建根节点（叶子）`,
        codeLine: line,
        pseudoLine: 2,
        targets: [leaf.id],
      });
      return;
    }

    // 找到目标叶子节点
    const leafId = this.findLeaf(this.rootId, key, recorder, line);
    const leaf = this.nodes.get(leafId)!;

    // 插入到叶子节点
    let pos = 0;
    while (pos < leaf.keys.length && leaf.keys[pos] < key) pos++;
    leaf.keys.splice(pos, 0, key);

    recorder.record({
      type: "CREATE_NODE",
      title: `在叶子节点插入 ${key}`,
      description: `位置 ${pos}，叶子关键字: [${leaf.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 2,
      targets: [leafId],
    });

    // 检查是否需要分裂
    if (leaf.keys.length > 2 * this.t - 1) {
      this.splitLeaf(leafId, recorder, line);
    }
  }

  // ── 查找 ──

  private doSearch(key: number, recorder: TraceRecorder, line: number): void {
    if (!this.rootId) {
      recorder.record({
        type: "VISIT_NODE",
        title: `查找 ${key}：B+ 树为空`,
        description: "B+ 树为空，查找失败",
        codeLine: line,
        pseudoLine: 8,
        targets: [],
      });
      return;
    }

    // 从根节点沿路径找到目标叶子节点
    const leafId = this.searchToLeaf(this.rootId, key, recorder, line);
    const leaf = this.nodes.get(leafId)!;

    // 在叶子节点中扫描
    recorder.record({
      type: "VISIT_NODE",
      title: `在叶子节点 [${leaf.keys.join(", ")}] 中查找 ${key}`,
      description: `扫描叶子节点的关键字`,
      codeLine: line,
      pseudoLine: 6,
      targets: [leafId],
    });

    const found = leaf.keys.includes(key);

    recorder.record({
      type: "COMPARE",
      title: found ? `找到 ${key}` : `查找 ${key}：未找到`,
      description: found
        ? `在叶子节点 [${leaf.keys.join(", ")}] 中找到关键字 ${key}`
        : `关键字 ${key} 不在叶子节点 [${leaf.keys.join(", ")}] 中`,
      codeLine: line,
      pseudoLine: found ? 7 : 8,
      targets: [leafId],
      payload: { found },
    });
  }

  /** 从根节点向下遍历到叶子节点，记录路径上的内部节点访问 */
  private searchToLeaf(nodeId: string, key: number, recorder: TraceRecorder, line: number): string {
    const node = this.nodes.get(nodeId)!;

    if (node.isLeaf) return nodeId;

    recorder.record({
      type: "VISIT_NODE",
      title: `访问内部节点 [${node.keys.join(", ")}]`,
      description: `查找 ${key} 应该进入的子树`,
      codeLine: line,
      pseudoLine: 3,
      targets: [nodeId],
    });

    let pos = 0;
    while (pos < node.keys.length && key >= node.keys[pos]) pos++;

    return this.searchToLeaf(node.children[pos], key, recorder, line);
  }

  private createLeaf(): BPlusNode {
    const id = this.newId();
    const node: BPlusNode = { id, keys: [], children: [], parent: null, isLeaf: true, next: null };
    this.nodes.set(id, node);
    return node;
  }

  private createInternal(): BPlusNode {
    const id = this.newId();
    const node: BPlusNode = { id, keys: [], children: [], parent: null, isLeaf: false, next: null };
    this.nodes.set(id, node);
    return node;
  }

  private findLeaf(nodeId: string, key: number, recorder: TraceRecorder, line: number): string {
    const node = this.nodes.get(nodeId)!;

    if (node.isLeaf) return nodeId;

    recorder.record({
      type: "VISIT_NODE",
      title: `访问内部节点 [${node.keys.join(", ")}]`,
      description: `查找 ${key} 应该进入的子树`,
      codeLine: line,
      pseudoLine: 1,
      targets: [nodeId],
    });

    let pos = 0;
    while (pos < node.keys.length && key >= node.keys[pos]) pos++;

    return this.findLeaf(node.children[pos], key, recorder, line);
  }

  private splitLeaf(leafId: string, recorder: TraceRecorder, line: number): void {
    const leaf = this.nodes.get(leafId)!;
    const t = this.t;
    const newLeaf = this.createLeaf();

    // 分配键（左边 ceil(2t-1/2) 个，右边其余）
    const mid = Math.ceil(leaf.keys.length / 2);
    newLeaf.keys = leaf.keys.splice(mid);

    // 维护叶子链表
    newLeaf.next = leaf.next;
    leaf.next = newLeaf.id;

    // 提升到父节点的键（取新叶子第一个键）
    const promotedKey = newLeaf.keys[0];

    recorder.record({
      type: "SPLIT_NODE",
      title: `叶子节点分裂，提升 ${promotedKey}`,
      description: `左: [${leaf.keys.join(", ")}]，右: [${newLeaf.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 4,
      targets: [leafId, newLeaf.id],
    });

    if (!leaf.parent) {
      // 根节点分裂，创建新根
      const newRoot = this.createInternal();
      newRoot.keys.push(promotedKey);
      newRoot.children.push(leafId, newLeaf.id);
      leaf.parent = newRoot.id;
      newLeaf.parent = newRoot.id;
      this.rootId = newRoot.id;

      recorder.record({
        type: "PROMOTE_KEY",
        title: `创建新根，提升 ${promotedKey}`,
        description: `新根关键字: [${promotedKey}]`,
        codeLine: line,
        pseudoLine: 5,
        targets: [newRoot.id],
      });
    } else {
      // 插入到父节点
      const parent = this.nodes.get(leaf.parent)!;
      const idx = parent.children.indexOf(leafId);
      parent.keys.splice(idx, 0, promotedKey);
      parent.children.splice(idx + 1, 0, newLeaf.id);
      newLeaf.parent = parent.id;

      recorder.record({
        type: "PROMOTE_KEY",
        title: `提升 ${promotedKey} 到父节点`,
        description: `父节点关键字: [${parent.keys.join(", ")}]`,
        codeLine: line,
        pseudoLine: 5,
        targets: [parent.id],
      });

      // 递归检查父节点
      if (parent.keys.length > 2 * t - 1) {
        this.splitInternal(parent.id, recorder, line);
      }
    }
  }

  private splitInternal(nodeId: string, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const t = this.t;
    const mid = t - 1;
    const promotedKey = node.keys[mid];

    const sibling = this.createInternal();
    sibling.keys = node.keys.splice(mid + 1);
    node.keys.splice(mid);
    sibling.children = node.children.splice(mid + 1);

    for (const cid of sibling.children) {
      const cn = this.nodes.get(cid);
      if (cn) cn.parent = sibling.id;
    }

    recorder.record({
      type: "SPLIT_NODE",
      title: `内部节点分裂，提升 ${promotedKey}`,
      description: `左: [${node.keys.join(", ")}]，右: [${sibling.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 9,
      targets: [nodeId, sibling.id],
    });

    if (!node.parent) {
      const newRoot = this.createInternal();
      newRoot.keys.push(promotedKey);
      newRoot.children.push(nodeId, sibling.id);
      node.parent = newRoot.id;
      sibling.parent = newRoot.id;
      this.rootId = newRoot.id;

      recorder.record({
        type: "PROMOTE_KEY",
        title: `创建新根，提升 ${promotedKey}`,
        description: `新根关键字: [${promotedKey}]`,
        codeLine: line,
        pseudoLine: 10,
        targets: [newRoot.id],
      });
    } else {
      const parent = this.nodes.get(node.parent)!;
      const idx = parent.children.indexOf(nodeId);
      parent.keys.splice(idx, 0, promotedKey);
      parent.children.splice(idx + 1, 0, sibling.id);
      sibling.parent = parent.id;

      if (parent.keys.length > 2 * t - 1) {
        this.splitInternal(parent.id, recorder, line);
      }
    }
  }

  // ===================== 删除相关方法 =====================

  private doDelete(key: number, recorder: TraceRecorder, line: number): void {
    recorder.record({
      type: "VISIT_NODE",
      title: `删除 ${key}`,
      description: `开始从 B+ 树删除关键字 ${key}`,
      codeLine: line,
      pseudoLine: 0,
      targets: [],
    });

    if (!this.rootId) {
      recorder.record({
        type: "VISIT_NODE",
        title: `B+ 树为空`,
        description: `无法删除 ${key}，树为空`,
        codeLine: line,
        pseudoLine: 0,
        targets: [],
      });
      return;
    }

    // 找到目标叶子节点
    const leafId = this.findLeaf(this.rootId, key, recorder, line);
    const leaf = this.nodes.get(leafId)!;

    // 在叶子中查找 key
    const keyIdx = leaf.keys.indexOf(key);
    if (keyIdx === -1) {
      recorder.record({
        type: "VISIT_NODE",
        title: `未找到 ${key}`,
        description: `关键字 ${key} 不在叶子节点中，无法删除`,
        codeLine: line,
        pseudoLine: 2,
        targets: [leafId],
      });
      return;
    }

    // 从叶子中删除 key
    leaf.keys.splice(keyIdx, 1);

    recorder.record({
      type: "VISIT_NODE",
      title: `从叶子节点删除 ${key}`,
      description: `位置 ${keyIdx}，剩余关键字: [${leaf.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 2,
      targets: [leafId],
    });

    // 如果是根节点且为叶子，无需调整
    if (leafId === this.rootId) {
      // 根节点为空时，保持（空树）
      return;
    }

    // 检查是否需要调整（下溢）
    const minKeys = this.t - 1;
    if (leaf.keys.length < minKeys) {
      this.fixLeafUnderflow(leafId, recorder, line);
    } else {
      // 没有下溢，但可能需要更新父节点中的索引 key
      this.updateParentIndexKey(leafId, recorder, line);
    }
  }

  /** 向上递归更新祖先节点中的索引 key（B+ 树中索引 key = 子树最小值） */
  private updateParentIndexKey(nodeId: string, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    if (!node.parent || node.keys.length === 0) return;

    const parent = this.nodes.get(node.parent)!;
    const childIdx = parent.children.indexOf(nodeId);
    // 索引 key 位于 childIdx - 1 的位置（第 0 个子树没有对应的索引 key）
    if (childIdx > 0) {
      const oldIndexKey = parent.keys[childIdx - 1];
      const newIndexKey = node.keys[0];
      if (oldIndexKey !== newIndexKey) {
        parent.keys[childIdx - 1] = newIndexKey;
        recorder.record({
          type: "PROMOTE_KEY",
          title: `更新索引 key: ${oldIndexKey} → ${newIndexKey}`,
          description: `父节点关键字: [${parent.keys.join(", ")}]`,
          codeLine: line,
          pseudoLine: 12,
          targets: [parent.id],
        });
        // 继续向上递归更新祖先的索引 key
        this.updateParentIndexKey(parent.id, recorder, line);
      }
    }
  }

  /** 修复叶子节点的下溢 */
  private fixLeafUnderflow(leafId: string, recorder: TraceRecorder, line: number): void {
    const leaf = this.nodes.get(leafId)!;
    if (!leaf.parent) {
      // 根节点下溢不需要修复（根节点至少 1 个 key 即可，甚至可以没有）
      return;
    }

    const parent = this.nodes.get(leaf.parent)!;
    const childIdx = parent.children.indexOf(leafId);

    // 尝试从左兄弟借位
    if (childIdx > 0) {
      const leftSiblingId = parent.children[childIdx - 1];
      const leftSibling = this.nodes.get(leftSiblingId)!;
      if (leftSibling.keys.length > this.t - 1) {
        this.borrowFromLeftLeaf(leafId, recorder, line);
        return;
      }
    }

    // 尝试从右兄弟借位
    if (childIdx < parent.children.length - 1) {
      const rightSiblingId = parent.children[childIdx + 1];
      const rightSibling = this.nodes.get(rightSiblingId)!;
      if (rightSibling.keys.length > this.t - 1) {
        this.borrowFromRightLeaf(leafId, recorder, line);
        return;
      }
    }

    // 无法借位，合并
    if (childIdx > 0) {
      // 与左兄弟合并
      this.mergeLeaves(parent.children[childIdx - 1], leafId, recorder, line);
    } else {
      // 与右兄弟合并
      this.mergeLeaves(leafId, parent.children[childIdx + 1], recorder, line);
    }
  }

  /** 从左兄弟叶子借一个 key */
  private borrowFromLeftLeaf(leafId: string, recorder: TraceRecorder, line: number): void {
    const leaf = this.nodes.get(leafId)!;
    const parent = this.nodes.get(leaf.parent!)!;
    const childIdx = parent.children.indexOf(leafId);
    const leftSiblingId = parent.children[childIdx - 1];
    const leftSibling = this.nodes.get(leftSiblingId)!;

    // 从左兄弟末尾取一个 key 放到当前叶子头部
    const borrowedKey = leftSibling.keys.pop()!;
    leaf.keys.unshift(borrowedKey);

    // 更新父节点中的索引 key
    parent.keys[childIdx - 1] = leaf.keys[0];

    recorder.record({
      type: "VISIT_NODE",
      title: `从左兄弟借位 ${borrowedKey}`,
      description: `左兄弟: [${leftSibling.keys.join(", ")}]，当前叶子: [${leaf.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 5,
      targets: [leftSiblingId, leafId],
    });

    recorder.record({
      type: "PROMOTE_KEY",
      title: `更新索引 key → ${leaf.keys[0]}`,
      description: `父节点关键字: [${parent.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 6,
      targets: [parent.id],
    });
  }

  /** 从右兄弟叶子借一个 key */
  private borrowFromRightLeaf(leafId: string, recorder: TraceRecorder, line: number): void {
    const leaf = this.nodes.get(leafId)!;
    const parent = this.nodes.get(leaf.parent!)!;
    const childIdx = parent.children.indexOf(leafId);
    const rightSiblingId = parent.children[childIdx + 1];
    const rightSibling = this.nodes.get(rightSiblingId)!;

    // 从右兄弟头部取一个 key 放到当前叶子末尾
    const borrowedKey = rightSibling.keys.shift()!;
    leaf.keys.push(borrowedKey);

    // 更新父节点中的索引 key（指向右兄弟的索引 = 右兄弟剩余最小 key）
    parent.keys[childIdx] = rightSibling.keys[0];

    recorder.record({
      type: "VISIT_NODE",
      title: `从右兄弟借位 ${borrowedKey}`,
      description: `当前叶子: [${leaf.keys.join(", ")}]，右兄弟: [${rightSibling.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 5,
      targets: [leafId, rightSiblingId],
    });

    recorder.record({
      type: "PROMOTE_KEY",
      title: `更新索引 key → ${rightSibling.keys[0]}`,
      description: `父节点关键字: [${parent.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 6,
      targets: [parent.id],
    });
  }

  /** 合并两个叶子节点（leftLeaf 和 rightLeaf） */
  private mergeLeaves(leftId: string, rightId: string, recorder: TraceRecorder, line: number): void {
    const leftLeaf = this.nodes.get(leftId)!;
    const rightLeaf = this.nodes.get(rightId)!;
    const parentId = leftLeaf.parent!;
    const parent = this.nodes.get(parentId)!;

    const mergeIdx = parent.children.indexOf(leftId);

    // 合并 keys
    leftLeaf.keys.push(...rightLeaf.keys);

    // 维护叶子链表：左叶子指向右叶子的 next
    leftLeaf.next = rightLeaf.next;

    // 从父节点移除索引 key 和右子节点
    parent.keys.splice(mergeIdx, 1);
    parent.children.splice(mergeIdx + 1, 1);

    // 删除右叶子节点
    this.nodes.delete(rightId);

    recorder.record({
      type: "SPLIT_NODE",
      title: `合并叶子节点`,
      description: `合并后: [${leftLeaf.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 8,
      targets: [leftId],
    });

    recorder.record({
      type: "VISIT_NODE",
      title: `从父节点移除索引 key`,
      description: `父节点关键字: [${parent.keys.join(", ")}]，子节点数: ${parent.children.length}`,
      codeLine: line,
      pseudoLine: 9,
      targets: [parentId],
    });

    // 检查父节点是否下溢
    if (parentId === this.rootId) {
      // 根节点特殊处理
      if (parent.keys.length === 0) {
        // 根节点变空，降低树高
        this.rootId = leftId;
        leftLeaf.parent = null;
        this.nodes.delete(parentId);

        recorder.record({
          type: "PROMOTE_KEY",
          title: `根节点变空，降低树高`,
          description: `新根为叶子节点: [${leftLeaf.keys.join(", ")}]`,
          codeLine: line,
          pseudoLine: 11,
          targets: [leftId],
        });
      }
    } else if (parent.keys.length < this.t - 1) {
      this.fixInternalUnderflow(parentId, recorder, line);
    }
  }

  /** 修复内部节点的下溢 */
  private fixInternalUnderflow(nodeId: string, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    if (!node.parent) return;

    const parent = this.nodes.get(node.parent)!;
    const childIdx = parent.children.indexOf(nodeId);

    // 尝试从左兄弟借位
    if (childIdx > 0) {
      const leftSiblingId = parent.children[childIdx - 1];
      const leftSibling = this.nodes.get(leftSiblingId)!;
      if (leftSibling.keys.length > this.t - 1) {
        this.borrowFromLeftInternal(nodeId, recorder, line);
        return;
      }
    }

    // 尝试从右兄弟借位
    if (childIdx < parent.children.length - 1) {
      const rightSiblingId = parent.children[childIdx + 1];
      const rightSibling = this.nodes.get(rightSiblingId)!;
      if (rightSibling.keys.length > this.t - 1) {
        this.borrowFromRightInternal(nodeId, recorder, line);
        return;
      }
    }

    // 无法借位，合并
    if (childIdx > 0) {
      this.mergeInternal(parent.children[childIdx - 1], nodeId, recorder, line);
    } else {
      this.mergeInternal(nodeId, parent.children[childIdx + 1], recorder, line);
    }
  }

  /** 从左兄弟内部节点借位（通过父节点 key 下移） */
  private borrowFromLeftInternal(nodeId: string, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const parent = this.nodes.get(node.parent!)!;
    const childIdx = parent.children.indexOf(nodeId);
    const leftSiblingId = parent.children[childIdx - 1];
    const leftSibling = this.nodes.get(leftSiblingId)!;

    // 父节点 key 下移到当前节点头部
    const parentKey = parent.keys[childIdx - 1];
    node.keys.unshift(parentKey);

    // 左兄弟最后一个 key 提升到父节点
    const promotedKey = leftSibling.keys.pop()!;
    parent.keys[childIdx - 1] = promotedKey;

    // 左兄弟最后一个子节点移到当前节点头部
    const movedChildId = leftSibling.children.pop()!;
    node.children.unshift(movedChildId);
    const movedChild = this.nodes.get(movedChildId);
    if (movedChild) movedChild.parent = nodeId;

    recorder.record({
      type: "VISIT_NODE",
      title: `内部节点从左兄弟借位`,
      description: `下移父 key ${parentKey}，提升 ${promotedKey}`,
      codeLine: line,
      pseudoLine: 5,
      targets: [leftSiblingId, nodeId],
    });

    recorder.record({
      type: "PROMOTE_KEY",
      title: `更新父索引 key → ${promotedKey}`,
      description: `父节点关键字: [${parent.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 6,
      targets: [parent.id],
    });
  }

  /** 从右兄弟内部节点借位（通过父节点 key 下移） */
  private borrowFromRightInternal(nodeId: string, recorder: TraceRecorder, line: number): void {
    const node = this.nodes.get(nodeId)!;
    const parent = this.nodes.get(node.parent!)!;
    const childIdx = parent.children.indexOf(nodeId);
    const rightSiblingId = parent.children[childIdx + 1];
    const rightSibling = this.nodes.get(rightSiblingId)!;

    // 父节点 key 下移到当前节点尾部
    const parentKey = parent.keys[childIdx];
    node.keys.push(parentKey);

    // 右兄弟第一个 key 提升到父节点
    const promotedKey = rightSibling.keys.shift()!;
    parent.keys[childIdx] = promotedKey;

    // 右兄弟第一个子节点移到当前节点尾部
    const movedChildId = rightSibling.children.shift()!;
    node.children.push(movedChildId);
    const movedChild = this.nodes.get(movedChildId);
    if (movedChild) movedChild.parent = nodeId;

    recorder.record({
      type: "VISIT_NODE",
      title: `内部节点从右兄弟借位`,
      description: `下移父 key ${parentKey}，提升 ${promotedKey}`,
      codeLine: line,
      pseudoLine: 5,
      targets: [nodeId, rightSiblingId],
    });

    recorder.record({
      type: "PROMOTE_KEY",
      title: `更新父索引 key → ${promotedKey}`,
      description: `父节点关键字: [${parent.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 6,
      targets: [parent.id],
    });
  }

  /** 合并两个内部节点（leftNode 和 rightNode） */
  private mergeInternal(leftId: string, rightId: string, recorder: TraceRecorder, line: number): void {
    const leftNode = this.nodes.get(leftId)!;
    const rightNode = this.nodes.get(rightId)!;
    const parentId = leftNode.parent!;
    const parent = this.nodes.get(parentId)!;

    const mergeIdx = parent.children.indexOf(leftId);

    // 将父节点的分隔 key 下移到左节点
    const parentKey = parent.keys[mergeIdx];
    leftNode.keys.push(parentKey);

    // 合并 keys 和 children
    leftNode.keys.push(...rightNode.keys);
    leftNode.children.push(...rightNode.children);

    // 更新移动过来的子节点的 parent 指针
    for (const cid of rightNode.children) {
      const cn = this.nodes.get(cid);
      if (cn) cn.parent = leftId;
    }

    // 从父节点移除 key 和右子节点
    parent.keys.splice(mergeIdx, 1);
    parent.children.splice(mergeIdx + 1, 1);

    // 删除右节点
    this.nodes.delete(rightId);

    recorder.record({
      type: "SPLIT_NODE",
      title: `合并内部节点，下移 key ${parentKey}`,
      description: `合并后: [${leftNode.keys.join(", ")}]`,
      codeLine: line,
      pseudoLine: 8,
      targets: [leftId],
    });

    recorder.record({
      type: "VISIT_NODE",
      title: `从父节点移除索引 key`,
      description: `父节点关键字: [${parent.keys.join(", ")}]，子节点数: ${parent.children.length}`,
      codeLine: line,
      pseudoLine: 9,
      targets: [parentId],
    });

    // 检查父节点是否下溢
    if (parentId === this.rootId) {
      if (parent.keys.length === 0) {
        // 根节点变空，降低树高
        this.rootId = leftId;
        leftNode.parent = null;
        this.nodes.delete(parentId);

        recorder.record({
          type: "PROMOTE_KEY",
          title: `根节点变空，降低树高`,
          description: `新根关键字: [${leftNode.keys.join(", ")}]`,
          codeLine: line,
          pseudoLine: 11,
          targets: [leftId],
        });
      }
    } else if (parent.keys.length < this.t - 1) {
      this.fixInternalUnderflow(parentId, recorder, line);
    }
  }
}
