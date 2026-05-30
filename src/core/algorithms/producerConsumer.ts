import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class ProducerConsumerRuntime implements StructureRuntime {
  private bufferSize = 0;
  private buffer: (number | null)[] = [];
  private mutex = 1;
  private empty = 0;
  private full = 0;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `pc-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    const bufferItems: VisualArrayItem[] = this.buffer.map((item) => ({
      id: this.nextId(),
      value: item !== null ? item : "-",
      status: item !== null ? "active" : ("default" as const),
    }));

    const semaphoreItems: VisualArrayItem[] = [
      {
        id: this.nextId(),
        value: `mutex=${this.mutex}`,
        status: this.mutex === 1 ? "default" : "highlighted",
      },
      {
        id: this.nextId(),
        value: `empty=${this.empty}`,
        status: "default",
      },
      {
        id: this.nextId(),
        value: `full=${this.full}`,
        status: "default",
      },
    ];

    return {
      type: "multiarray",
      arrays: [bufferItems, semaphoreItems],
      labels: ["缓冲区", "信号量"],
    };
  }

  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void {
    switch (method) {
      case "init":
        this.doInit(args, recorder, line);
        break;
      case "produce":
        this.doProduce(args, recorder, line);
        break;
      case "consume":
        this.doConsume(recorder, line);
        break;
      default:
        throw new Error(`ProducerConsumer 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    const count = this.buffer.filter((b) => b !== null).length;
    return {
      mutex: { type: "number", value: this.mutex, display: `${this.mutex}` },
      empty: { type: "number", value: this.empty, display: `${this.empty}` },
      full: { type: "number", value: this.full, display: `${this.full}` },
      缓冲区使用: {
        type: "string",
        value: `${count}/${this.bufferSize}`,
        display: `${count}/${this.bufferSize}`,
      },
    };
  }

  private doInit(args: Literal[], recorder: TraceRecorder, line: number): void {
    this.bufferSize = Number(args[0]);
    this.buffer = new Array(this.bufferSize).fill(null);
    this.empty = this.bufferSize;
    this.full = 0;
    this.mutex = 1;

    recorder.record({
      type: "INIT_DISTANCE",
      title: "生产者-消费者: 初始化",
      description: `初始化缓冲区大小=${this.bufferSize}，信号量: mutex=1, empty=${this.empty}, full=0`,
      codeLine: line,
      targets: [],
    });
  }

  private doProduce(args: Literal[], recorder: TraceRecorder, line: number): void {
    const data = Number(args[0]);

    // wait(empty)
    if (this.empty <= 0) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `生产者: 生产 ${data} 失败`,
        description: `缓冲区已满（empty=${this.empty}），生产者必须等待`,
        codeLine: line,
        targets: [],
      });
      return;
    }
    this.empty--;

    // wait(mutex)
    this.mutex--;

    // Find first empty slot
    const slotIdx = this.buffer.indexOf(null);
    if (slotIdx === -1) {
      // Should not happen if empty > 0, but safeguard
      this.mutex++;
      this.empty++;
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `生产者: 生产 ${data} 失败`,
        description: "缓冲区无空闲槽位",
        codeLine: line,
        targets: [],
      });
      return;
    }

    this.buffer[slotIdx] = data;
    this.full++;

    // signal(mutex)
    this.mutex++;

    recorder.record({
      type: "PUSH",
      title: `生产者: 生产 ${data}`,
      description: `将数据 ${data} 放入缓冲区槽位[${slotIdx}]。信号量: mutex=${this.mutex}, empty=${this.empty}, full=${this.full}`,
      codeLine: line,
      targets: [`slot-${slotIdx}`],
    });
  }

  private doConsume(recorder: TraceRecorder, line: number): void {
    // wait(full)
    if (this.full <= 0) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: "消费者: 消费失败",
        description: `缓冲区为空（full=${this.full}），消费者必须等待`,
        codeLine: line,
        targets: [],
      });
      return;
    }
    this.full--;

    // wait(mutex)
    this.mutex--;

    // Find first non-empty slot (FIFO)
    const slotIdx = this.buffer.findIndex((b) => b !== null);
    if (slotIdx === -1) {
      this.mutex++;
      this.full++;
      recorder.record({
        type: "CHECK_INVARIANT",
        title: "消费者: 消费失败",
        description: "缓冲区无数据",
        codeLine: line,
        targets: [],
      });
      return;
    }

    const data = this.buffer[slotIdx]!;
    this.buffer[slotIdx] = null;
    this.empty++;

    // signal(mutex)
    this.mutex++;

    recorder.record({
      type: "POP",
      title: `消费者: 消费 ${data}`,
      description: `从缓冲区槽位[${slotIdx}]取出数据 ${data}。信号量: mutex=${this.mutex}, empty=${this.empty}, full=${this.full}`,
      codeLine: line,
      targets: [`slot-${slotIdx}`],
    });
  }
}
