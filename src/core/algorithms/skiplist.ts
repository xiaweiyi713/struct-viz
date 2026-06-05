import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── 内部节点类型 ──

interface SkipNode {
  id: string;
  key: number;
  level: number; // 该节点出现的最高层数 (0-indexed)
  next: (string | null)[]; // 每一层的下一个节点 id
}

// ── 哨兵 key ──

const NEG_INF = -Infinity;
const POS_INF = Infinity;

// ── SkipListRuntime ──

export class SkipListRuntime implements StructureRuntime {
  private nodes = new Map<string, SkipNode>();
  private maxLevel: number;
  private currentMaxLevel = 0; // 当前跳表中实际用到的最高层数
  private idCounter = 0;
  private elementCount = 0;

  // 哨兵节点
  private headerId: string;
  private tailId: string;

  constructor(maxLevel: number = 4) {
    this.maxLevel = maxLevel;

    // 创建头节点 (key = -inf)
    this.headerId = this.nextId();
    const header: SkipNode = {
      id: this.headerId,
      key: NEG_INF,
      level: this.maxLevel - 1,
      next: new Array(this.maxLevel).fill(null),
    };
    this.nodes.set(this.headerId, header);

    // 创建尾节点 (key = +inf)
    this.tailId = this.nextId();
    const tail: SkipNode = {
      id: this.tailId,
      key: POS_INF,
      level: this.maxLevel - 1,
      next: new Array(this.maxLevel).fill(null),
    };
    this.nodes.set(this.tailId, tail);

    // 头节点每一层指向尾节点
    for (let i = 0; i < this.maxLevel; i++) {
      header.next[i] = this.tailId;
    }
  }

  private nextId(): string {
    this.idCounter += 1;
    return `sl-node-${this.idCounter}`;
  }

  // 确定性伪随机层数：基于 key 的哈希
  private randomLevel(key: number): number {
    let level = 0;
    let hash = key * 2654435761;
    while ((hash & 1) && level < this.maxLevel - 1) {
      level++;
      hash >>= 1;
    }
    return level;
  }

  private displayKey(key: number): string {
    if (key === NEG_INF) return "H";
    if (key === POS_INF) return "T";
    return `${key}`;
  }

  private displayValue(key: number): number | string {
    if (key === NEG_INF) return "H";
    if (key === POS_INF) return "T";
    return key;
  }

  // ── 快照：multiarray 可视化 ──

  getSnapshot(): VisualStructure {
    // 从底层(level 0)到最高层构建每层的数组
    const arrays: VisualArrayItem[][] = [];
    const labels: string[] = [];

    for (let lvl = 0; lvl < this.maxLevel; lvl++) {
      const items: VisualArrayItem[] = [];
      let currentId: string | null = this.headerId;

      while (currentId !== null) {
        const node: SkipNode = this.nodes.get(currentId)!;
        // 只有节点在该层出现才显示
        if (node.level >= lvl) {
          items.push({
            id: `${node.id}-L${lvl}`,
            value: this.displayValue(node.key),
            status: "default",
          });
        }
        // 顺着该层的 next 指针走
        currentId = node.next[lvl] ?? null;
      }

      // 只显示非空且不只有哨兵的层，或者至少显示底层
      if (lvl === 0 || items.length > 0) {
        arrays.push(items);
        labels.push(`Level ${lvl}`);
      }
    }

    return {
      type: "multiarray",
      arrays,
      labels,
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      maxLevel: {
        type: "number",
        value: this.maxLevel,
        display: `${this.maxLevel}`,
      },
      currentLevel: {
        type: "number",
        value: this.currentMaxLevel + 1,
        display: `${this.currentMaxLevel + 1}`,
      },
      size: {
        type: "number",
        value: this.elementCount,
        display: `${this.elementCount}`,
      },
    };
  }

  // ── executeMethod ──

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
      default:
        throw new Error(`SkipList 不支持方法 "${method}"`);
    }
  }

  // ── 辅助：获取某层某节点的 array item id ──

  private itemId(nodeId: string, lvl: number): string {
    return `${nodeId}-L${lvl}`;
  }

  // ── INSERT ──

  private doInsert(key: number, recorder: TraceRecorder, line: number): void {
    const newLevel = this.randomLevel(key);

    recorder.record({
      type: "VISIT_NODE",
      title: `插入 key = ${key}`,
      description: `随机决定层数为 ${newLevel + 1} 层 (0~${newLevel})`,
      codeLine: line,
      pseudoLine: 1,
      targets: [this.itemId(this.headerId, 0)],
    });

    // update[] 记录每层插入位置的前驱节点
    const update: (string | null)[] = new Array(this.maxLevel).fill(null);

    let currentId: string | null = this.headerId;

    // 从最高层往下搜索插入位置
    for (let lvl = this.maxLevel - 1; lvl >= 0; lvl--) {
      const currentNode: SkipNode = this.nodes.get(currentId!)!;
      let nextId: string | null = currentNode.next[lvl] ?? null;

      // 在当前层向右搜索
      while (nextId !== null) {
        const nextNode = this.nodes.get(nextId)!;

        recorder.record({
          type: "COMPARE",
          title: `Level ${lvl}: 比较 ${this.displayKey(currentNode.key)} → ${this.displayKey(nextNode.key)}`,
          description: `${this.displayKey(nextNode.key)} ${nextNode.key < key ? "<" : nextNode.key === key ? "==" : ">"} ${key}`,
          codeLine: line,
          pseudoLine: 5,
          targets: [this.itemId(nextId, lvl)],
        });

        if (nextNode.key >= key) {
          break;
        }

        currentId = nextId;
        // currentNode 引用需要更新
        const movedNode = this.nodes.get(currentId!)!;
        nextId = movedNode.next[lvl];
      }

      update[lvl] = currentId;

      // 向下移动时记录
      if (lvl > 0) {
        recorder.record({
          type: "VISIT_NODE",
          title: `Level ${lvl} → Level ${lvl - 1}`,
          description: `在 ${this.displayKey(this.nodes.get(currentId!)!.key)} 处向下移动到 Level ${lvl - 1}`,
          codeLine: line,
          pseudoLine: 4,
          targets: [this.itemId(currentId!, lvl - 1)],
        });
      }
    }

    // 检查是否已存在
    const insertAfterNode = this.nodes.get(currentId!)!;
    const existingNextId = insertAfterNode.next[0];
    if (existingNextId !== null) {
      const existingNext = this.nodes.get(existingNextId)!;
      if (existingNext.key === key) {
        recorder.record({
          type: "COMPARE",
          title: `key ${key} 已存在`,
          description: `跳表中已有 ${key}，不重复插入`,
          codeLine: line,
          pseudoLine: 5,
          targets: [this.itemId(existingNextId, 0)],
        });
        return;
      }
    }

    // 创建新节点
    const newNodeId = this.nextId();
    const newNode: SkipNode = {
      id: newNodeId,
      key,
      level: newLevel,
      next: new Array(this.maxLevel).fill(null),
    };
    this.nodes.set(newNodeId, newNode);

    // 在 0 ~ newLevel 层插入
    for (let lvl = 0; lvl <= newLevel; lvl++) {
      const prevId = update[lvl];
      if (prevId !== null) {
        const prevNode = this.nodes.get(prevId)!;
        newNode.next[lvl] = prevNode.next[lvl];
        prevNode.next[lvl] = newNodeId;
      }

      recorder.record({
        type: "LINK_NODE",
        title: `Level ${lvl}: 插入 ${key}`,
        description: `在 ${this.displayKey(this.nodes.get(prevId!)!.key)} 之后插入 ${key}`,
        codeLine: line,
        pseudoLine: 6,
        targets: [this.itemId(newNodeId, lvl)],
      });
    }

    // 更新最高层
    if (newLevel > this.currentMaxLevel) {
      this.currentMaxLevel = newLevel;
    }

    this.elementCount++;

    recorder.record({
      type: "MARK_FINAL",
      title: `插入 ${key} 完成`,
      description: `节点 ${key} 被插入到 Level 0~${newLevel}，共 ${newLevel + 1} 层`,
      codeLine: line,
      pseudoLine: 6,
      targets: [this.itemId(newNodeId, 0)],
    });
  }

  // ── SEARCH ──

  private doSearch(key: number, recorder: TraceRecorder, line: number): void {
    recorder.record({
      type: "VISIT_NODE",
      title: `查找 key = ${key}`,
      description: `从最高层 Level ${this.maxLevel - 1} 开始搜索`,
      codeLine: line,
      pseudoLine: 8,
      targets: [this.itemId(this.headerId, this.maxLevel - 1)],
    });

    let currentId: string | null = this.headerId;

    for (let lvl = this.maxLevel - 1; lvl >= 0; lvl--) {
      const currentNode: SkipNode = this.nodes.get(currentId!)!;
      let nextId: string | null = currentNode.next[lvl] ?? null;

      // 在当前层向右搜索
      while (nextId !== null) {
        const nextNode = this.nodes.get(nextId)!;

        recorder.record({
          type: "COMPARE",
          title: `Level ${lvl}: 比较 ${this.displayKey(nextNode.key)} 与 ${key}`,
          description: `${this.displayKey(nextNode.key)} ${nextNode.key < key ? "<" : nextNode.key === key ? "==" : ">"} ${key}`,
          codeLine: line,
          pseudoLine: 10,
          targets: [this.itemId(nextId, lvl)],
        });

        if (nextNode.key === key) {
          // 找到了
          recorder.record({
            type: "MARK_FINAL",
            title: `找到 key = ${key}`,
            description: `在 Level ${lvl} 找到目标节点`,
            codeLine: line,
            pseudoLine: 13,
            targets: [this.itemId(nextId, lvl)],
          });
          return;
        }

        if (nextNode.key > key) {
          break;
        }

        currentId = nextId;
        nextId = this.nodes.get(currentId!)!.next[lvl];
      }

      // 向下移动
      if (lvl > 0) {
        recorder.record({
          type: "VISIT_NODE",
          title: `Level ${lvl} → Level ${lvl - 1}`,
          description: `在 ${this.displayKey(this.nodes.get(currentId!)!.key)} 处向下移动`,
          codeLine: line,
          pseudoLine: 9,
          targets: [this.itemId(currentId!, lvl - 1)],
        });
      }
    }

    // 搜索完成，检查底层下一个节点
    const bottomNode = this.nodes.get(currentId!)!;
    const bottomNextId = bottomNode.next[0];

    if (bottomNextId !== null) {
      const bottomNext = this.nodes.get(bottomNextId)!;
      if (bottomNext.key === key) {
        recorder.record({
          type: "MARK_FINAL",
          title: `找到 key = ${key}`,
          description: `在底层 Level 0 找到目标节点`,
          codeLine: line,
          pseudoLine: 13,
          targets: [this.itemId(bottomNextId, 0)],
        });
        return;
      }
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `未找到 key = ${key}`,
      description: `搜索完所有层，key ${key} 不在跳表中`,
      codeLine: line,
      pseudoLine: 13,
      targets: [],
    });
  }
}
