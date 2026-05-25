import type {
  Literal,
  VisualStructure,
  VisualArrayItem,
  RuntimeValue,
} from "../../types";
import type { StructureRuntime } from "../executor/runtime";
import type { TraceRecorder } from "../executor/traceRecorder";

export class DiningPhilosophersRuntime implements StructureRuntime {
  private philosopherCount = 0;
  // States: "thinking", "hungry", "eating"
  private states: string[] = [];
  // Chopsticks: 0 = available, 1 = taken
  private chopsticks: number[] = [];
  private idCounter = 0;

  private nextId(): string {
    this.idCounter += 1;
    return `dp-${this.idCounter}`;
  }

  private buildSnapshot(): VisualStructure {
    const stateItems: VisualArrayItem[] = this.states.map((state, idx) => ({
      id: this.nextId(),
      value: `P${idx}:${state === "eating" ? "就餐" : state === "hungry" ? "饥饿" : "思考"}`,
      status:
        state === "eating"
          ? ("active" as const)
          : state === "hungry"
            ? ("highlighted" as const)
            : ("default" as const),
    }));

    const chopItems: VisualArrayItem[] = this.chopsticks.map((taken, idx) => ({
      id: this.nextId(),
      value: `叉${idx}:${taken === 0 ? "可用" : "被占"}`,
      status: taken === 0 ? ("default" as const) : ("removed" as const),
    }));

    return {
      type: "multiarray",
      arrays: [stateItems, chopItems],
      labels: ["哲学家状态", "筷子状态"],
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
        this.doInit(Number(args[0]), recorder, line);
        break;
      case "think":
        this.doThink(Number(args[0]), recorder, line);
        break;
      case "eat":
        this.doEat(Number(args[0]), recorder, line);
        break;
      default:
        throw new Error(`DiningPhilosophers 不支持方法 "${method}"`);
    }
  }

  getSnapshot(): VisualStructure {
    return this.buildSnapshot();
  }

  getVariables(): Record<string, RuntimeValue> {
    const eatingCount = this.states.filter((s) => s === "eating").length;
    const vars: Record<string, RuntimeValue> = {
      哲学家数: {
        type: "number",
        value: this.philosopherCount,
        display: `${this.philosopherCount}`,
      },
      就餐中: {
        type: "number",
        value: eatingCount,
        display: `${eatingCount}`,
      },
    };
    return vars;
  }

  private doInit(n: number, recorder: TraceRecorder, line: number): void {
    this.philosopherCount = n;
    this.states = new Array(n).fill("thinking");
    this.chopsticks = new Array(n).fill(0);

    recorder.record({
      type: "INIT_DISTANCE",
      title: "哲学家就餐: 初始化",
      description: `初始化 ${n} 个哲学家和 ${n} 根筷子，所有哲学家初始状态为"思考"`,
      codeLine: line,
      targets: [],
    });
  }

  private doThink(id: number, recorder: TraceRecorder, line: number): void {
    if (id < 0 || id >= this.philosopherCount) {
      throw new Error(`哲学家 ${id} 不存在（共 ${this.philosopherCount} 个）`);
    }

    // Release chopsticks if currently eating
    if (this.states[id] === "eating") {
      const leftChop = id;
      const rightChop = (id + 1) % this.philosopherCount;
      this.chopsticks[leftChop] = 0;
      this.chopsticks[rightChop] = 0;
    }

    this.states[id] = "thinking";

    recorder.record({
      type: "VISIT_NODE",
      title: `哲学家 P${id}: 开始思考`,
      description: `哲学家 P${id} 放下筷子，进入思考状态。筷子状态: [${this.chopsticks.join(", ")}]`,
      codeLine: line,
      targets: [`phil-${id}`],
    });
  }

  private doEat(id: number, recorder: TraceRecorder, line: number): void {
    if (id < 0 || id >= this.philosopherCount) {
      throw new Error(`哲学家 ${id} 不存在（共 ${this.philosopherCount} 个）`);
    }

    const leftChop = id;
    const rightChop = (id + 1) % this.philosopherCount;

    // Set state to hungry
    this.states[id] = "hungry";

    recorder.record({
      type: "CHECK_INVARIANT",
      title: `哲学家 P${id}: 饥饿`,
      description: `哲学家 P${id} 感到饥饿，尝试获取筷子。左叉=${leftChop}(${this.chopsticks[leftChop] === 0 ? "可用" : "被占"})，右叉=${rightChop}(${this.chopsticks[rightChop] === 0 ? "可用" : "被占"})`,
      codeLine: line,
      targets: [`phil-${id}`],
    });

    // Odd-even strategy: odd picks left first, even picks right first
    let first: number;
    let second: number;
    if (id % 2 === 1) {
      first = leftChop;
      second = rightChop;
    } else {
      first = rightChop;
      second = leftChop;
    }

    // Try to pick up first chopstick
    if (this.chopsticks[first] === 1) {
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `哲学家 P${id}: 等待叉${first}`,
        description: `哲学家 P${id} 无法获取叉${first}（被占），继续等待`,
        codeLine: line,
        targets: [`chop-${first}`],
      });
      this.states[id] = "hungry";
      return;
    }
    this.chopsticks[first] = 1;

    // Try to pick up second chopstick
    if (this.chopsticks[second] === 1) {
      // Put back first chopstick
      this.chopsticks[first] = 0;
      recorder.record({
        type: "CHECK_INVARIANT",
        title: `哲学家 P${id}: 等待叉${second}`,
        description: `哲学家 P${id} 获取了叉${first}但叉${second}被占，放下叉${first}等待`,
        codeLine: line,
        targets: [`chop-${second}`],
      });
      this.states[id] = "hungry";
      return;
    }
    this.chopsticks[second] = 1;

    // Got both chopsticks, start eating
    this.states[id] = "eating";

    recorder.record({
      type: "FILL_CELL",
      title: `哲学家 P${id}: 开始就餐`,
      description: `哲学家 P${id} 获得叉${leftChop}和叉${rightChop}，开始就餐。筷子状态: [${this.chopsticks.join(", ")}]`,
      codeLine: line,
      targets: [`phil-${id}`],
    });
  }
}
