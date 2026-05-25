import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

// ── 内部节点结构 ──

interface StackNode {
  id: string;
  value: number;
}

// ── StackRuntime ──

export class StackRuntime implements StructureRuntime {
  private items: StackNode[] = [];
  private idCounter = 0;

  // ── 工具方法 ──

  private nextId(): string {
    this.idCounter += 1;
    return `stack-node-${this.idCounter}`;
  }

  /** 生成当前 items 的可视化数组 */
  private buildVisualItems(): VisualArrayItem[] {
    return this.items.map((item, index) => ({
      id: item.id,
      value: item.value,
      status: index === this.items.length - 1 ? ("highlighted" as const) : ("default" as const),
    }));
  }

  // ── StructureRuntime 实现 ──

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "push":
        this.doPush(Number(args[0]), recorder, line);
        break;
      case "pop":
        this.doPop(recorder, line);
        break;
      case "peek":
        this.doPeek(recorder, line);
        break;
      default:
        throw new Error(`Stack 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return {
      type: "stack",
      items: this.buildVisualItems(),
    };
  }

  getVariables(): Record<string, RuntimeValue> {
    const size = this.items.length;
    const topItem = this.items[size - 1];

    return {
      size: {
        type: "number",
        value: size,
        display: `${size}`,
      },
      top: topItem
        ? { type: "number", value: topItem.value, display: `${topItem.value}` }
        : { type: "null", value: null, display: "null" },
    };
  }

  // ── 栈操作 ──

  private doPush(value: number, recorder: TraceRecorder, line: number): void {
    const id = this.nextId();
    const node: StackNode = { id, value };

    this.items.push(node);

    const stackContent = this.items.map((n) => n.value).join(", ");

    recorder.record({
      type: "PUSH",
      title: `入栈 ${value}`,
      description: `将元素 ${value} 压入栈顶。当前栈（自底向上）: [${stackContent}]，栈大小: ${this.items.length}`,
      codeLine: line,
      targets: [id],
    });
  }

  private doPop(recorder: TraceRecorder, line: number): void {
    if (this.items.length === 0) {
      throw new Error("栈为空，无法执行 pop 操作");
    }

    const popped = this.items.pop()!;
    const stackContent = this.items.map((n) => n.value).join(", ");

    recorder.record({
      type: "POP",
      title: `出栈 ${popped.value}`,
      description: `弹出栈顶元素 ${popped.value}。${this.items.length > 0 ? `当前栈（自底向上）: [${stackContent}]，栈大小: ${this.items.length}` : "栈已空"}`,
      codeLine: line,
      targets: [popped.id],
    });
  }

  private doPeek(recorder: TraceRecorder, line: number): void {
    if (this.items.length === 0) {
      throw new Error("栈为空，无法执行 peek 操作");
    }

    const top = this.items[this.items.length - 1];

    recorder.record({
      type: "VISIT_NODE",
      title: `查看栈顶 ${top.value}`,
      description: `查看栈顶元素，值为 ${top.value}。栈大小: ${this.items.length}，栈不会发生变化`,
      codeLine: line,
      targets: [top.id],
    });
  }
}
