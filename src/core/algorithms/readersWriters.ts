import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class ReadersWritersRuntime implements StructureRuntime {
  private buffer: (string | null)[] = [];
  private bufferSize = 5;
  private readcount = 0;
  private writecount = 0;
  private rw_mutex = 1;
  private mutex = 1;
  private activeReaders: number[] = [];
  private activeWriter: number | null = null;
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `rw-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    const bufferItems: VisualArrayItem[] = this.buffer.map((item) => ({
      id: this.nextId(),
      value: item !== null ? item : "-",
      status: item !== null ? ("active" as const) : ("default" as const),
    }));

    const semaphoreItems: VisualArrayItem[] = [
      {
        id: this.nextId(),
        value: `readcount=${this.readcount}`,
        status: this.readcount > 0 ? "highlighted" : "default",
      },
      {
        id: this.nextId(),
        value: `writecount=${this.writecount}`,
        status: this.writecount > 0 ? "highlighted" : "default",
      },
      {
        id: this.nextId(),
        value: `rw_mutex=${this.rw_mutex}`,
        status: this.rw_mutex === 1 ? "default" : "highlighted",
      },
      {
        id: this.nextId(),
        value: `mutex=${this.mutex}`,
        status: this.mutex === 1 ? "default" : "highlighted",
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
      case "reader":
        this.doReader(Number(args[0]), recorder, line);
        break;
      case "writer":
        this.doWriter(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`ReadersWriters 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    return {
      readcount: { type: "number", value: this.readcount, display: `${this.readcount}` },
      writecount: { type: "number", value: this.writecount, display: `${this.writecount}` },
      rw_mutex: { type: "number", value: this.rw_mutex, display: `${this.rw_mutex}` },
      mutex: { type: "number", value: this.mutex, display: `${this.mutex}` },
      活跃读者: {
        type: "string",
        value: this.activeReaders.length > 0 ? `R${this.activeReaders.join(",R")}` : "无",
        display: this.activeReaders.length > 0 ? `R${this.activeReaders.join(",R")}` : "无",
      },
      活跃写者: {
        type: "string",
        value: this.activeWriter !== null ? `W${this.activeWriter}` : "无",
        display: this.activeWriter !== null ? `W${this.activeWriter}` : "无",
      },
    };
  }

  private doReader(id: number, recorder: TraceRecorder, line: number): void {
    // Reader enters
    // wait(mutex)
    if (this.mutex <= 0) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `读者 R${id}: 等待进入`,
        description: `mutex=0，读者 R${id} 等待 mutex 信号量`,
        codeLine: line,
        targets: [],
      });
      return;
    }
    this.mutex--;
    this.readcount++;

    if (this.readcount === 1) {
      // First reader locks resource
      if (this.rw_mutex <= 0) {
        recorder.record({
          type: "CHECK_INVARIANT",
          title: `读者 R${id}: 等待资源`,
          description: `首个读者 R${id} 等待 rw_mutex（写者正在写入）`,
          codeLine: line,
          targets: [],
        });
        this.readcount--;
        this.mutex++;
        return;
      }
      this.rw_mutex--;
    }

    // signal(mutex)
    this.mutex++;

    // Read operation
    this.activeReaders.push(id);
    const dataContent = `R${id}读`;
    this.writeToBuffer(dataContent);

    recorder.record({
      type: "VISIT_NODE",
      title: `读者 R${id}: 开始读取`,
      description: `读者 R${id} 进入读取。当前 readcount=${this.readcount}，活跃读者: [${this.activeReaders.join(",")}]`,
      codeLine: line,
      targets: [`reader-${id}`],
    });

    // Reader exits
    // wait(mutex)
    this.mutex--;
    this.activeReaders = this.activeReaders.filter((r) => r !== id);
    this.readcount--;

    if (this.readcount === 0) {
      // Last reader unlocks resource
      this.rw_mutex++;
    }

    // signal(mutex)
    this.mutex++;

    recorder.record({
      type: "CHECK_INVARIANT",
      title: `读者 R${id}: 读取完成`,
      description: `读者 R${id} 退出。当前 readcount=${this.readcount}${this.readcount === 0 ? "，释放 rw_mutex" : ""}`,
      codeLine: line,
      targets: [`reader-${id}`],
    });
  }

  private doWriter(id: number, recorder: TraceRecorder, line: number): void {
    // Writer enters
    this.writecount++;

    if (this.rw_mutex <= 0) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `写者 W${id}: 等待资源`,
        description: `写者 W${id} 等待 rw_mutex（资源被占用）`,
        codeLine: line,
        targets: [],
      });
      this.writecount--;
      return;
    }
    this.rw_mutex--;

    // Write operation
    this.activeWriter = id;
    const dataContent = `W${id}写`;
    this.writeToBuffer(dataContent);

    recorder.record({
      type: "FILL_CELL",
      title: `写者 W${id}: 开始写入`,
      description: `写者 W${id} 获得独占访问，开始写入。rw_mutex=${this.rw_mutex}`,
      codeLine: line,
      targets: [`writer-${id}`],
    });

    // Writer exits
    this.activeWriter = null;
    this.rw_mutex++;
    this.writecount--;

    recorder.record({
      type: "CHECK_INVARIANT",
      title: `写者 W${id}: 写入完成`,
      description: `写者 W${id} 释放资源。rw_mutex=${this.rw_mutex}`,
      codeLine: line,
      targets: [`writer-${id}`],
    });
  }

  private writeToBuffer(content: string): void {
    // Shift buffer and add new content at the end
    if (this.buffer.length >= this.bufferSize) {
      this.buffer.shift();
    }
    this.buffer.push(content);
  }
}
