import type {
  Literal,
  VisualStructure,
  VisualTreeNode,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── BinaryHeapRuntime ──

interface HeapNode {
  id: string;
  value: number;
}

export class BinaryHeapRuntime implements StructureRuntime {
  private heap: HeapNode[] = [];
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `hp-${this.idCounter}`;
  }

  /** 根据数组索引构建树形可视化节点 */
  private buildVisualNodes(): Record<string, VisualTreeNode> {
    const result: Record<string, VisualTreeNode> = {};

    for (let i = 0; i < this.heap.length; i++) {
      const node = this.heap[i];
      const leftIdx = 2 * i + 1;
      const rightIdx = 2 * i + 2;
      const parentIdx = Math.floor((i - 1) / 2);

      result[node.id] = {
        id: node.id,
        key: node.value,
        left: leftIdx < this.heap.length ? this.heap[leftIdx].id : null,
        right: rightIdx < this.heap.length ? this.heap[rightIdx].id : null,
        parent: i > 0 ? this.heap[parentIdx].id : null,
      };
    }

    return result;
  }

  private get rootId(): string | null {
    return this.heap.length > 0 ? this.heap[0].id : null;
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
      case "extract":
        this.doExtract(recorder, line);
        break;
      case "build":
        this.doBuild(args.map(Number), recorder, line);
        break;
      default:
        throw new Error(`BinaryHeap 不支持方法 "${method}"`);
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
    return {
      size: { type: "number", value: this.heap.length, display: `${this.heap.length}` },
      top: this.heap.length > 0
        ? { type: "number", value: this.heap[0].value, display: `${this.heap[0].value}` }
        : { type: "null", value: null, display: "null" },
    };
  }

  // ── 上滤（最小堆） ──

  private siftUp(index: number, recorder: TraceRecorder, line: number): void {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.heap[parentIdx].value <= this.heap[index].value) break;

      // 交换
      recorder.record({
        type: "SWAP",
        title: `上滤: 交换 ${this.heap[index].value} 和父节点 ${this.heap[parentIdx].value}`,
        description: `节点 ${this.heap[index].value} 小于父节点 ${this.heap[parentIdx].value}，上移`,
        codeLine: line,
        targets: [this.heap[index].id, this.heap[parentIdx].id],
      });

      [this.heap[index], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[index]];
      index = parentIdx;
    }
  }

  // ── 下滤（最小堆） ──

  private siftDown(index: number, recorder: TraceRecorder, line: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < n && this.heap[left].value < this.heap[smallest].value) {
        smallest = left;
      }
      if (right < n && this.heap[right].value < this.heap[smallest].value) {
        smallest = right;
      }

      if (smallest === index) break;

      recorder.record({
        type: "SWAP",
        title: `下滤: 交换 ${this.heap[index].value} 和子节点 ${this.heap[smallest].value}`,
        description: `节点 ${this.heap[index].value} 大于子节点 ${this.heap[smallest].value}，下移`,
        codeLine: line,
        targets: [this.heap[index].id, this.heap[smallest].id],
      });

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }

  // ── 插入 ──

  private doInsert(value: number, recorder: TraceRecorder, line: number): void {
    const id = this.nextId();
    const node: HeapNode = { id, value };
    this.heap.push(node);

    recorder.record({
      type: "PUSH",
      title: `插入 ${value}`,
      description: `将 ${value} 添加到堆末尾（位置 ${this.heap.length - 1}），准备上滤`,
      codeLine: line,
      targets: [id],
    });

    this.siftUp(this.heap.length - 1, recorder, line);

    recorder.record({
      type: "MARK_FINAL",
      title: `插入完成: ${value}`,
      description: `堆已恢复最小堆性质。当前堆顶: ${this.heap[0].value}`,
      codeLine: line,
      targets: [id],
    });
  }

  // ── 取堆顶 ──

  private doExtract(recorder: TraceRecorder, line: number): void {
    if (this.heap.length === 0) throw new Error("堆为空，无法执行 extract 操作");

    const top = this.heap[0];
    const last = this.heap[this.heap.length - 1];

    recorder.record({
      type: "POP",
      title: `取出堆顶 ${top.value}`,
      description: `堆顶为 ${top.value}，将末尾元素 ${last.value} 移到堆顶，准备下滤`,
      codeLine: line,
      targets: [top.id],
    });

    this.heap[0] = last;
    this.heap.pop();

    if (this.heap.length > 0) {
      this.siftDown(0, recorder, line);
    }

    recorder.record({
      type: "MARK_FINAL",
      title: `提取完成`,
      description: `取出堆顶 ${top.value}。${this.heap.length > 0 ? `新堆顶: ${this.heap[0].value}` : "堆已空"}`,
      codeLine: line,
      targets: this.heap.length > 0 ? [this.heap[0].id] : [],
    });
  }

  // ── 建堆 ──

  private doBuild(values: number[], recorder: TraceRecorder, line: number): void {
    this.heap = [];
    this.idCounter = 0;

    // 先将所有值放入数组
    for (const v of values) {
      const id = this.nextId();
      this.heap.push({ id, value: v });
    }

    recorder.record({
      type: "CHECK_INVARIANT",
      title: "开始建堆",
      description: `初始数组: [${values.join(", ")}]，共 ${values.length} 个元素。使用 Floyd 建堆算法`,
      codeLine: line,
      targets: [],
    });

    // 从最后一个非叶节点开始下滤
    const startIdx = Math.floor(this.heap.length / 2) - 1;
    for (let i = startIdx; i >= 0; i--) {
      recorder.record({
        type: "VISIT_NODE",
        title: `下滤节点 ${this.heap[i].value}（位置 ${i}）`,
        description: `从位置 ${i} 开始下滤调整`,
        codeLine: line,
        targets: [this.heap[i].id],
      });

      this.siftDown(i, recorder, line);
    }

    recorder.record({
      type: "MARK_FINAL",
      title: "建堆完成",
      description: `堆已建立，堆顶（最小值）: ${this.heap[0].value}`,
      codeLine: line,
      targets: [this.heap[0].id],
    });
  }
}
