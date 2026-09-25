import { describe, it, expect } from "vitest";
import { parse } from "../parser/parser";
import { createRuntime } from "../executor";

function exec(code: string) {
  const result = parse(code);
  expect(result.errors).toHaveLength(0);
  const runtime = createRuntime();
  return runtime.execute(result.program!);
}

/** 取最后一帧事件的标题（算法通常把最终答案写在 MARK_FINAL 帧标题里） */
function lastTitle(r: ReturnType<ReturnType<typeof createRuntime>["execute"]>) {
  return r.frames[r.frames.length - 1].event.title;
}

describe("LCS 最长公共子序列", () => {
  it("ABCBDAB 与 BDCABA 的 LCS 长度为 4", () => {
    const r = exec(`LCS l;\nl.solve("ABCBDAB", "BDCABA");`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
    expect(lastTitle(r)).toContain("长度 4");
  });

  it("空字符串", () => {
    const r = exec(`LCS l;\nl.solve("", "ABC");`);
    expect(r.errors).toHaveLength(0);
    expect(lastTitle(r)).toContain("长度 0");
  });
});

describe("Knapsack 0/1 背包", () => {
  it("容量 10 的最优价值为 13", () => {
    // (w=2,v=3) (w=3,v=4) (w=4,v=5) (w=5,v=6)，容量 10
    const r = exec(`Knapsack ks;\nks.solve(2, 3, 3, 4, 4, 5, 5, 6, 10);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
    expect(lastTitle(r)).toContain("价值 13");
  });

  it("参数不足时报业务错误", () => {
    const r = exec(`Knapsack ks;\nks.solve(5);`);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe("EditDistance 编辑距离", () => {
  it("horse -> ros 的编辑距离为 3", () => {
    const r = exec(`EditDistance e;\ne.solve("horse", "ros");`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
    expect(lastTitle(r)).toContain("编辑距离 = 3");
  });

  it("相同字符串距离为 0", () => {
    const r = exec(`EditDistance e;\ne.solve("abc", "abc");`);
    expect(r.errors).toHaveLength(0);
    expect(lastTitle(r)).toContain("编辑距离 = 0");
  });
});

describe("LIS 最长递增子序列", () => {
  it("经典用例长度为 4", () => {
    const r = exec(`LIS lis;\nlis.solve(10, 9, 2, 5, 3, 7, 101, 18);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
    expect(lastTitle(r)).toContain("LIS 长度 = 4");
  });
});

describe("MatrixChain 矩阵链乘法", () => {
  it("CLRS 经典用例最少乘法次数为 15125", () => {
    const r = exec(`MatrixChain mc;\nmc.solve(30, 35, 15, 5, 10, 20, 25);`);
    expect(r.errors).toHaveLength(0);
    expect(r.frames.length).toBeGreaterThan(0);
    expect(lastTitle(r)).toContain("最少乘法次数: 15125");
  });

  it("单个矩阵乘法次数为 0", () => {
    const r = exec(`MatrixChain mc;\nmc.solve(10, 20);`);
    expect(r.errors).toHaveLength(0);
  });
});
