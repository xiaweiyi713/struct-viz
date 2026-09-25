import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";
import {
  TraceRecorder,
  FrameLimitExceededError,
  MAX_FRAMES,
} from "../executor/traceRecorder";

function runCode(code: string) {
  const result = parse(code);
  expect(result.errors).toHaveLength(0);
  const runtime = createRuntime();
  return runtime.execute(result.program!);
}

describe("robustness: 帧数上限防 OOM", () => {
  it("record 超过 MAX_FRAMES 时抛 FrameLimitExceededError", () => {
    const recorder = new TraceRecorder(() => ({}) as never);
    for (let i = 0; i < MAX_FRAMES; i++) {
      recorder.record({ type: "VISIT_NODE", title: "t", codeLine: 1 } as never);
    }
    expect(() => recorder.record({ type: "VISIT_NODE", title: "t", codeLine: 1 } as never)).toThrow(
      FrameLimitExceededError,
    );
    expect(recorder.getFrames()).toHaveLength(MAX_FRAMES);
  });

  it("getFrames 返回拷贝，外部修改不影响内部", () => {
    const recorder = new TraceRecorder(() => ({}) as never);
    recorder.record({ type: "VISIT_NODE", title: "t", codeLine: 1 } as never);
    const frames = recorder.getFrames();
    frames.push({} as never);
    expect(recorder.getFrames()).toHaveLength(1);
  });

  it("大输入触发帧上限时转为用户可读错误而非崩溃", () => {
    // 300 个逆序数做快排：帧数远超上限，应得到清晰错误而不是 OOM
    const values = Array.from({ length: 300 }, (_, i) => 300 - i).join(", ");
    const execResult = runCode(`QuickSort qs;\nqs.sort(${values});`);
    expect(execResult.errors.length).toBeGreaterThan(0);
    expect(execResult.errors[0]).toContain("超过上限");
    expect(execResult.frames.length).toBeLessThanOrEqual(MAX_FRAMES);
  });
});

describe("robustness: 快排有序输入不栈溢出", () => {
  it("已排序的中等规模数组可完成（尾递归优化）", () => {
    const values = Array.from({ length: 120 }, (_, i) => i + 1).join(", ");
    const execResult = runCode(`QuickSort qs;\nqs.sort(${values});`);
    expect(execResult.errors).toHaveLength(0);
    const lastFrame = execResult.frames[execResult.frames.length - 1];
    expect(lastFrame.event.description).toContain("快速排序完成");
  });
});

describe("robustness: 算法参数校验", () => {
  it("KMP 空模式串报业务错误", () => {
    const execResult = runCode(`KMP kmp;\nkmp.match("abc", "");`);
    expect(execResult.errors.length).toBeGreaterThan(0);
    expect(execResult.errors[0]).toContain("模式串不能为空");
  });

  it("KMP 缺参数不产生静默的 undefined 匹配", () => {
    const execResult = runCode(`KMP kmp;\nkmp.match("abc");`);
    expect(execResult.errors.length).toBeGreaterThan(0);
    expect(execResult.errors[0]).toContain("需要 2 个参数");
  });

  it("Huffman 无权值参数报业务错误", () => {
    const execResult = runCode(`Huffman h;\nh.build();`);
    expect(execResult.errors.length).toBeGreaterThan(0);
    expect(execResult.errors[0]).toContain("至少 1 个权值");
  });

  it("fractional-knapsack 模板代码可正常执行", () => {
    const execResult = runCode(
      `FractionalKnapsack fk;\nfk.solve(50, 10, 60, 20, 100, 30, 120);`,
    );
    expect(execResult.errors).toHaveLength(0);
    expect(execResult.frames.length).toBeGreaterThan(0);
  });
});

describe("robustness: 词法错误不再静默", () => {
  it("非法字符 @ 产生带行列号的解析错误", () => {
    const result = parse(`BST t;\nt.insert(5);\nt@search(5);`);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("无法识别的字符 '@'");
    expect(result.errors[0].line).toBe(3);
  });

  it("非法位置的负号报错而非改变语义", () => {
    const result = parse(`Queue q;\nq.enqueue(3-5);`);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("负号位置非法");
  });

  it("未闭合字符串报明确错误", () => {
    const result = parse(`KMP kmp;\nkmp.match("abc, "def");`);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("字符串未闭合");
  });

  it("合法的负数参数仍然可用", () => {
    const result = parse(`ArrayList arr;\narr.add(-5);\narr.add(3, -2);`);
    expect(result.errors).toHaveLength(0);
  });
});
