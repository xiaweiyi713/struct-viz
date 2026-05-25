import type {
  TraceFrame,
  Literal,
  Program,
  VisualStructure,
  RuntimeValue,
} from "../../types";
import { TraceRecorder, type SnapshotProvider } from "./traceRecorder";

// ── StructureRuntime 接口 ──

export interface StructureRuntime {
  /** 执行指定方法，通过 recorder 记录 trace */
  executeMethod(
    method: string,
    args: Literal[],
    recorder: TraceRecorder,
    line: number,
  ): void;

  /** 返回当前结构的可视化快照 */
  getSnapshot(): VisualStructure;

  /** 返回当前的运行时变量表 */
  getVariables(): Record<string, RuntimeValue>;
}

// ── 工厂函数类型 ──

export type StructureFactory = (args: Literal[]) => StructureRuntime;

// ── 执行结果 ──

export interface ExecutionResult {
  frames: TraceFrame[];
  errors: string[];
}

// ── Runtime 主类 ──

export class Runtime {
  private structures = new Map<string, StructureRuntime>();
  private classFactories = new Map<string, StructureFactory>();
  private recorder: TraceRecorder;
  private errors: string[] = [];

  constructor() {
    this.recorder = new TraceRecorder(this.buildSnapshotProvider());
  }

  /** 注册一个结构类型（如 "BST", "Stack", "Graph"） */
  registerClass(name: string, factory: StructureFactory): void {
    this.classFactories.set(name, factory);
  }

  /** 声明一个新变量：bst = BST([5, 3, 7]) */
  declare(
    className: string,
    varName: string,
    args: Literal[],
    line: number,
  ): void {
    if (this.structures.has(varName)) {
      this.errors.push(
        `第 ${line} 行: 变量 "${varName}" 已存在，不能重复声明`,
      );
      return;
    }

    const factory = this.classFactories.get(className);
    if (!factory) {
      this.errors.push(
        `第 ${line} 行: 未注册的结构类型 "${className}"`,
      );
      return;
    }

    try {
      const instance = factory(args);
      this.structures.set(varName, instance);
    } catch (e) {
      this.errors.push(
        `第 ${line} 行: 创建 ${className} 失败 — ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 调用方法：bst.insert(10) */
  callMethod(
    target: string,
    method: string,
    args: Literal[],
    line: number,
  ): void {
    const instance = this.structures.get(target);
    if (!instance) {
      this.errors.push(
        `第 ${line} 行: 变量 "${target}" 未声明`,
      );
      return;
    }

    try {
      instance.executeMethod(method, args, this.recorder, line);
    } catch (e) {
      this.errors.push(
        `第 ${line} 行: ${target}.${method}() 执行失败 — ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** 执行完整的 AST 程序，返回 trace 帧和错误列表 */
  execute(program: Program): ExecutionResult {
    this.structures.clear();
    this.errors = [];
    this.recorder.reset();

    for (const stmt of program.body) {
      switch (stmt.type) {
        case "Declaration":
          this.declare(stmt.className, stmt.variableName, stmt.args, stmt.line);
          break;

        case "MethodCall":
          this.callMethod(stmt.target, stmt.method, stmt.args, stmt.line);
          break;

        case "Comment":
          // 注释语句不做任何操作
          break;
      }
    }

    return {
      frames: this.recorder.getFrames(),
      errors: this.errors,
    };
  }

  /** 构建快照回调：遍历所有已注册结构收集快照和变量 */
  private buildSnapshotProvider(): SnapshotProvider {
    return () => {
      const structures: Record<string, VisualStructure> = {};
      const variables: Record<string, RuntimeValue> = {};

      for (const [name, runtime] of this.structures) {
        structures[name] = runtime.getSnapshot();
        const vars = runtime.getVariables();
        for (const [key, val] of Object.entries(vars)) {
          variables[`${name}.${key}`] = val;
        }
      }

      return { structures, variables };
    };
  }
}
