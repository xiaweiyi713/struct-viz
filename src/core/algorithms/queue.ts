import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

interface QueueNode {
  id: string;
  value: number;
}

export class QueueRuntime implements StructureRuntime {
  private items: QueueNode[] = [];
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `queue-node-${this.idCounter}`;
  }

  private buildVisualItems(): VisualArrayItem[] {
    return this.items.map((item, index) => ({
      id: item.id,
      value: item.value,
      status: index === 0 ? ("highlighted" as const) : ("default" as const),
    }));
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "enqueue":
      case "push":
        this.doEnqueue(Number(args[0]), recorder, line);
        break;
      case "dequeue":
      case "pop":
        this.doDequeue(recorder, line);
        break;
      case "front":
      case "peek":
        this.doFront(recorder, line);
        break;
      default:
        throw new Error(`Queue 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "queue",
      items: this.buildVisualItems(),
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    const size = this.items.length;
    const frontItem = this.items[0];
    const rearItem = this.items[size - 1];

    return {
      size: {
        type: "number",
        value: size,
        display: `${size}`,
      },
      front: frontItem
        ? { type: "number", value: frontItem.value, display: `${frontItem.value}` }
        : { type: "null", value: null, display: "null" },
      rear: rearItem
        ? { type: "number", value: rearItem.value, display: `${rearItem.value}` }
        : { type: "null", value: null, display: "null" },
    };
  }

  private doEnqueue(value: number, recorder: TraceRecorder, line: number): void {
    const id = this.nextId();
    const node: QueueNode = { id, value };

    this.items.push(node);

    const content = this.items.map((n) => n.value).join(", ");

    recorder.record({
      type: "ENQUEUE",
      title: `入队 ${value}`,
      description: `将元素 ${value} 加入队尾。当前队列: [${content}]，队列大小: ${this.items.length}`,
      codeLine: line,
      targets: [id],
    });
  }

  private doDequeue(recorder: TraceRecorder, line: number): void {
    if (this.items.length === 0) {
      throw new Error("队列为空，无法执行 dequeue 操作");
    }

    const dequeued = this.items.shift()!;
    const content = this.items.map((n) => n.value).join(", ");

    recorder.record({
      type: "DEQUEUE",
      title: `出队 ${dequeued.value}`,
      description: `移除队头元素 ${dequeued.value}。${this.items.length > 0 ? `当前队列: [${content}]，队列大小: ${this.items.length}` : "队列已空"}`,
      codeLine: line,
      targets: [dequeued.id],
    });
  }

  private doFront(recorder: TraceRecorder, line: number): void {
    if (this.items.length === 0) {
      throw new Error("队列为空，无法执行 front 操作");
    }

    const front = this.items[0];

    recorder.record({
      type: "VISIT_NODE",
      title: `查看队头 ${front.value}`,
      description: `查看队头元素，值为 ${front.value}。队列大小: ${this.items.length}，队列不会发生变化`,
      codeLine: line,
      targets: [front.id],
    });
  }
}
